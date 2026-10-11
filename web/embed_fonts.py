"""Turn the browser build into a standalone offline page for the Android app: embed fonts, add doctype/viewport."""
import base64, re, sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
def face(fam, f, w):
    b = base64.b64encode(open(os.path.join(here, 'fonts', f), 'rb').read()).decode()
    return f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,{b}) format('woff2')}}"
faces = [face('Cinzel', f'cinzel-latin-{w}-normal.woff2', w) for w in (500, 700, 900)] + \
        [face('Chakra Petch', f'chakra-petch-latin-{w}-normal.woff2', w) for w in (400, 600, 700)]
s = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)[^>]*>\n?', '', s)
s = s.replace('<style>\n', '<style>\n' + '\n'.join(faces) + '\n', 1)
i = s.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n')
open(dst, 'w', encoding='utf-8').write(head + s[:i] + '\n</head><body>\n' + s[i:] + '\n</body></html>\n')
print('wrote', dst, len(s))
