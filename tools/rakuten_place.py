"""
楽天（A8.net）の商品カードを、ページに差しこむスクリプト。
- リンクのコードは tools/rakuten_items.json（A8の管理画面で、サイト「かべノート」用に作ったものを1文字も変えずに保存）から使う
- 差しこんだ場所は <!--pr:名前--> … <!--/pr:名前--> の目印で囲むので、何度実行しても同じ結果になる
"""
import json, os, re, html

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public')
ITEMS = {d['id']: d for d in json.load(open(os.path.join(ROOT, 'tools', 'rakuten_items.json'), encoding='utf-8'))}

def yen(p):
    n = re.sub(r'[^\d]', '', p)
    return f'{int(n):,}円' + ('〜' if ('～' in p or '〜' in p) else '')

def jdate(at):
    y, m, d = at.split('/')
    return f'{int(y)}年{int(m)}月{int(d)}日'

def card(item_id, name, note, label='楽天市場'):
    it = ITEMS[item_id]
    img = it['img'].replace('_ex=64x64', '_ex=128x128')
    return (f'<a class="pr-item" href="{html.escape(it["url"])}" rel="nofollow sponsored noopener" target="_blank">'
            f'<img src="{html.escape(img)}" width="96" height="96" alt="" loading="lazy">'
            f'<span class="pr-iname">{name}</span>'
            f'<span class="pr-iprice">{label}：{yen(it["price"])}<small>（{jdate(it["at"])}時点）</small><span class="pr-inote">{note}</span></span></a>')

def items_html(key, items, label='楽天市場'):
    px = ITEMS[items[0][0]]['px']
    return (f'<!--pr:{key}--><div class="pr-items">' + ''.join(card(*i, label=label) for i in items) +
            f'</div><img border="0" width="1" height="1" src="{html.escape(px)}" alt="" class="px"><!--/pr:{key}-->')

def aside(key, title, lead, items, label='楽天市場'):
    return (f'<!--pr:{key}--><aside class="pr" aria-label="広告"><p class="pr-h"><span class="pr-tag">PR</span>{title}</p>'
            f'<p class="pr-t">{lead}</p>' + items_html(key + 'i', items, label).replace(f'<!--pr:{key}i-->', '').replace(f'<!--/pr:{key}i-->', '') +
            f'</aside><!--/pr:{key}-->')

def clean(s):
    return re.sub(r'\s*<!--pr:(\w+)-->.*?<!--/pr:\1-->', '', s, flags=re.S)

FURU = [
  ('f016918-betsukai:10003150', '北海道別海町　ホタテ（訳あり・不揃い）', '大きさがそろっていない分、量が多めの返礼品'),
  ('f152277-tainai:10000168', '新潟県胎内市　新潟県産コシヒカリ（無洗米）', '量と、定期便にするかを選べるお米'),
  ('f222101-fuji:10000384', '静岡県富士市　トイレットペーパー ダブル', '毎日使う日用品。ロール数を選べます'),
  ('f402052-iizuka:10000315', '福岡県飯塚市　鉄板焼ハンバーグ デミソース', '温めるだけで食べられる冷凍のハンバーグ'),
  ('f016918-betsukai:10000337', '北海道別海町　いくら醤油漬け', '内容量を選べるいくら'),
  ('f272132-izumisano:10009508', '大阪府泉佐野市　ソフトパックティッシュ', '箱なしでかさばらないティッシュ'),
]
BOOKS = [
  ('book:22084833', 'いちばんわかりやすい確定申告の書き方（令和9年3月15日締切分）', '2026年分の確定申告に対応した版'),
  ('book:22102309', '7日でマスター フリーランス・個人事業主の確定申告がおもしろいくらいわかる本 2027年版', '帳簿のつけ方から申告書の書き方まで、7日に分けて進める本'),
]
BOOK_LEAD = '会計ソフトを使わずに自分で申告書を書くなら、その年の分に合わせた本が1冊あると安心です。2026年分（2027年3月15日締切）に対応した版です。'

def furusato():
    f = os.path.join(PUB, 'furusato/index.html'); s = clean(open(f, encoding='utf-8').read())
    anchor = '<p class="pr-l"><a href="https://rpx.a8.net'
    i = s.index('<aside class="pr"'); j = s.index(anchor, i)
    s = s[:j] + items_html('furu', FURU, '寄付額') + '\n    ' + s[j:]
    open(f, 'w', encoding='utf-8').write(s); print('furusato', len(FURU))

def nencho():
    f = os.path.join(PUB, 'nencho/index.html'); s = clean(open(f, encoding='utf-8').read())
    b = aside('nencho', 'ふるさと納税をするなら12月31日まで',
              '年末調整のあとでも、2026年分のふるさと納税は12月31日まで間に合います。上限額の目安は<a href="/furusato/">ふるさと納税の上限額シミュレーター</a>で計算できます。',
              FURU[:3], '寄付額')
    anchor = '<section class="explain">'
    assert anchor in s
    s = s.replace(anchor, b + '\n\n  ' + anchor, 1)
    open(f, 'w', encoding='utf-8').write(s); print('nencho')

def books(path, indent):
    f = os.path.join(PUB, path); s = clean(open(f, encoding='utf-8').read())
    i = s.index('<aside class="pr"'); j = s.index('</aside>', i) + len('</aside>')
    b = aside('books', '自分で申告書を書くなら', BOOK_LEAD, BOOKS)
    s = s[:j] + '\n\n' + indent + b + s[j:]
    open(f, 'w', encoding='utf-8').write(s); print(path)

if __name__ == '__main__':
    furusato(); nencho()
    books('fukugyo/index.html', '  ')
    books('kiji/fukugyo-keihi/index.html', '    ')
