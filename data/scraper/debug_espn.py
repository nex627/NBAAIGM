import requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}
resp = requests.get("https://www.espn.com/nba/team/roster/_/name/lal", headers=HEADERS, timeout=30)
import pathlib
pathlib.Path(r"D:\nexdev\nbatrade\data\raw\espn_roster_lal.html").write_text(resp.text, encoding="utf-8")
print(f"Status: {resp.status_code}, Length: {len(resp.text)}")
# Check for table
from bs4 import BeautifulSoup
soup = BeautifulSoup(resp.text, "lxml")
tables = soup.select(".ResponsiveTable")
print(f"Tables with .ResponsiveTable: {len(tables)}")
all_tables = soup.find_all("table")
print(f"All tables: {len(all_tables)}")
for t in all_tables:
    print(f"  table classes: {t.get('class')}")