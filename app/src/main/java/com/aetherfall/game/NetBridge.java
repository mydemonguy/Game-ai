package com.aetherfall.game;

import android.app.Activity;
import android.content.Context;
import android.net.wifi.WifiManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Same-Wi-Fi co-op link for the WebView game: one phone hosts a TCP server, the other joins it.
 * Messages are single-line JSON strings; incoming lines are batched and handed to window.NETJS on the UI thread.
 * The host also sends a UDP broadcast beacon every second so the joining phone can find it without typing an address.
 */
public class NetBridge {
    static final int TCP_PORT = 47890, UDP_PORT = 47891;
    private static final String BEACON = "AETHERFALL1|";

    private final Activity act;
    private final WebView web;
    private final LinkedBlockingQueue<String> sendQ = new LinkedBlockingQueue<>();
    private final ArrayList<String> inbox = new ArrayList<>();
    private boolean flushPosted = false;
    private volatile int gen = 0;                 // bumps on close(), so stale threads stop quietly
    private volatile ServerSocket server;
    private volatile Socket sock;
    private volatile DatagramSocket beaconSock, scanSock;
    private WifiManager.MulticastLock mlock;

    NetBridge(Activity act, WebView web) { this.act = act; this.web = web; }

    // ---------------------------------------------------------------- JS API

    /** This phone's Wi-Fi IPv4 address, or "" if it has none. */
    @JavascriptInterface
    public String localIp() {
        try {
            String fallback = "";
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address)) continue;
                    String ip = a.getHostAddress();
                    if (ni.getName().startsWith("wlan") || ni.getName().startsWith("ap")) return ip;
                    if (fallback.isEmpty()) fallback = ip;
                }
            }
            return fallback;
        } catch (Exception e) { return ""; }
    }

    /** Start hosting: accept one player on TCP and advertise this phone on the local network. */
    @JavascriptInterface
    public void host(final String name) {
        close();
        final int g = gen;
        new Thread(() -> {
            try {
                ServerSocket ss = new ServerSocket();
                ss.setReuseAddress(true);
                ss.bind(new InetSocketAddress(TCP_PORT));
                server = ss;
                startBeacon(name, g);
                Socket s = ss.accept();
                if (g != gen) { s.close(); return; }
                stopBeacon();
                try { ss.close(); } catch (Exception ignored) { }
                server = null;
                attach(s, g);
            } catch (Exception e) {
                if (g == gen) event("error", "host: " + e.getMessage());
            }
        }, "af-host").start();
    }

    /** Join the game hosted at the given IPv4 address. */
    @JavascriptInterface
    public void join(final String ip) {
        close();
        final int g = gen;
        new Thread(() -> {
            try {
                Socket s = new Socket();
                s.connect(new InetSocketAddress(ip.trim(), TCP_PORT), 6000);
                if (g != gen) { s.close(); return; }
                attach(s, g);
            } catch (Exception e) {
                if (g == gen) event("error", "join: " + e.getMessage());
            }
        }, "af-join").start();
    }

    /** Queue one message (a single line of JSON) for the other phone. */
    @JavascriptInterface
    public void send(String msg) {
        if (sock != null && msg != null) sendQ.offer(msg);
    }

    /** Listen for host beacons; each one found is reported to NETJS.found(name, ip). */
    @JavascriptInterface
    public void scan(boolean on) {
        stopScan();
        if (!on) return;
        final int g = gen;
        new Thread(() -> {
            try {
                lockMulticast(true);
                DatagramSocket ds = new DatagramSocket(null);
                ds.setReuseAddress(true);
                ds.setBroadcast(true);
                ds.bind(new InetSocketAddress(UDP_PORT));
                scanSock = ds;
                byte[] buf = new byte[256];
                while (g == gen && scanSock == ds) {
                    DatagramPacket p = new DatagramPacket(buf, buf.length);
                    ds.receive(p);
                    String m = new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8);
                    if (!m.startsWith(BEACON)) continue;
                    String name = m.substring(BEACON.length());
                    String ip = p.getAddress().getHostAddress();
                    js("window.NETJS&&NETJS.found(" + JSONObject.quote(name) + "," + JSONObject.quote(ip) + ")");
                }
            } catch (Exception ignored) {
            } finally { lockMulticast(false); }
        }, "af-scan").start();
    }

    /** Drop any connection, server, beacon and scan. */
    @JavascriptInterface
    public void close() {
        gen++;
        stopBeacon();
        stopScan();
        try { if (server != null) server.close(); } catch (Exception ignored) { }
        server = null;
        try { if (sock != null) sock.close(); } catch (Exception ignored) { }
        sock = null;
        sendQ.clear();
    }

    // ---------------------------------------------------------------- internals

    private void attach(final Socket s, final int g) throws Exception {
        s.setTcpNoDelay(true);
        s.setKeepAlive(true);
        sock = s;
        sendQ.clear();
        final BufferedWriter out = new BufferedWriter(new OutputStreamWriter(s.getOutputStream(), StandardCharsets.UTF_8));
        final BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
        event("connected", s.getInetAddress().getHostAddress());
        new Thread(() -> {                               // writer: drain the queue, flush once per batch
            try {
                while (g == gen && sock == s) {
                    String m = sendQ.take();
                    out.write(m); out.write('\n');
                    String more;
                    while ((more = sendQ.poll()) != null) { out.write(more); out.write('\n'); }
                    out.flush();
                }
            } catch (Exception ignored) { }
        }, "af-write").start();
        new Thread(() -> {                               // reader: one JSON message per line
            try {
                String line;
                while (g == gen && (line = in.readLine()) != null) deliver(line);
            } catch (Exception ignored) { }
            if (g == gen) { sock = null; event("closed", ""); }
        }, "af-read").start();
    }

    private void deliver(String line) {
        synchronized (inbox) {
            inbox.add(line);
            if (flushPosted) return;
            flushPosted = true;
        }
        act.runOnUiThread(() -> {
            String batch;
            synchronized (inbox) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < inbox.size(); i++) { if (i > 0) sb.append(','); sb.append(inbox.get(i)); }
                sb.append(']');
                batch = sb.toString();
                inbox.clear();
                flushPosted = false;
            }
            web.evaluateJavascript("window.NETJS&&NETJS.recvRaw(" + JSONObject.quote(batch) + ")", null);
        });
    }

    private void startBeacon(final String name, final int g) {
        new Thread(() -> {
            try {
                DatagramSocket ds = new DatagramSocket();
                ds.setBroadcast(true);
                beaconSock = ds;
                byte[] msg = (BEACON + (name == null ? "Aetherfall" : name)).getBytes(StandardCharsets.UTF_8);
                InetAddress all = InetAddress.getByName("255.255.255.255");
                while (g == gen && beaconSock == ds) {
                    try { ds.send(new DatagramPacket(msg, msg.length, all, UDP_PORT)); } catch (Exception ignored) { }
                    Thread.sleep(1000);
                }
            } catch (Exception ignored) { }
        }, "af-beacon").start();
    }

    private void stopBeacon() {
        try { if (beaconSock != null) beaconSock.close(); } catch (Exception ignored) { }
        beaconSock = null;
    }

    private void stopScan() {
        try { if (scanSock != null) scanSock.close(); } catch (Exception ignored) { }
        scanSock = null;
    }

    private void lockMulticast(boolean on) {
        try {
            if (on) {
                if (mlock == null) {
                    WifiManager wm = (WifiManager) act.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                    if (wm == null) return;
                    mlock = wm.createMulticastLock("aetherfall-scan");
                    mlock.setReferenceCounted(false);
                }
                mlock.acquire();
            } else if (mlock != null && mlock.isHeld()) mlock.release();
        } catch (Exception ignored) { }
    }

    private void event(String type, String info) {
        js("window.NETJS&&NETJS.event(" + JSONObject.quote(type) + "," + JSONObject.quote(info == null ? "" : info) + ")");
    }

    private void js(final String code) {
        act.runOnUiThread(() -> web.evaluateJavascript(code, null));
    }
}
