from pathlib import Path
import re

raw_dir = Path(r'd:\nexdev\nbatrade\data\raw')
page1 = raw_dir / 'spotrac_contracts_page1.html'
html = page1.read_text(encoding='utf-8')

from bs4 import BeautifulSoup
soup = BeautifulSoup(html, 'lxml')
table = soup.select_one('table')
rows = table.select('tbody tr')
print(f"Page 1: {len(rows)} rows")

first_names = []
for row in rows[:5]:
    cells = row.find_all('td')
    if cells:
        a = cells[0].find('a')
        if a:
            first_names.append(a.get_text(strip=True))
print(f"前5名: {first_names}")

last_names = []
for row in rows[-5:]:
    cells = row.find_all('td')
    if cells:
        a = cells[0].find('a')
        if a:
            last_names.append(a.get_text(strip=True))
print(f"后5名: {last_names}")

pagination = soup.find_all(string=re.compile(r'Next|Page|pagination', re.IGNORECASE))
print(f"\n分页相关文本: {[p.strip()[:50] for p in pagination[:5]]}")

pagination_div = soup.find('div', class_=re.compile(r'paginat', re.IGNORECASE))
if pagination_div:
    print(f"分页div: {pagination_div.get_text(strip=True)[:200]}")
else:
    print("未找到分页div")

data_count = soup.find_all(string=re.compile(r'1,000|1000'))
print(f"总数文本: {[d.strip()[:50] for d in data_count[:3]]}")
