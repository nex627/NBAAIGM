"""
NBA 每日变更清单生成器 (一键运行)
用法: python generate_daily_changes.py [--pages 3] [--date 2026-05-25]

流程:
  1. 爬取虎扑 NBA 新闻
  2. 爬取 HoopsRumors NBA 新闻
  3. 分类、去重、交叉验证
  4. 生成变更清单 (JSON + Markdown)
"""
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def run_script(script_name: str, args: list[str] = None) -> bool:
    script_path = SCRIPT_DIR / script_name
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)

    print(f"\n{'='*60}")
    print(f"▶ 运行: {script_name} {' '.join(args) if args else ''}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(cmd, cwd=str(SCRIPT_DIR), timeout=120)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"  ❌ 超时: {script_name}")
        return False
    except Exception as e:
        print(f"  ❌ 错误: {e}")
        return False


def main():
    print("=" * 60)
    print(f"🏀 NBA 每日变更清单生成器")
    print(f"   日期: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    pages = "3"
    date = ""

    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--pages" and i + 1 < len(sys.argv):
            pages = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--date" and i + 1 < len(sys.argv):
            date = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    print(f"\n📋 配置: 爬取页数={pages}, 日期={date or '今天'}")

    ok = True

    print("\n" + "━" * 60)
    print("步骤 1/3: 爬取虎扑 NBA 新闻")
    print("━" * 60)
    if not run_script("crawl_news_hupu.py", [pages]):
        print("  ⚠️ 虎扑爬虫失败，继续执行其他步骤...")
        ok = False

    time.sleep(2)

    print("\n" + "━" * 60)
    print("步骤 2/3: 爬取 HoopsRumors NBA 新闻")
    print("━" * 60)
    hr_pages = str(max(1, int(pages) - 1))
    if not run_script("crawl_news_hoopsrumors.py", [hr_pages]):
        print("  ⚠️ HoopsRumors 爬虫失败，继续执行其他步骤...")
        ok = False

    time.sleep(1)

    print("\n" + "━" * 60)
    print("步骤 3/3: 分类、去重、生成变更清单")
    print("━" * 60)
    classifier_args = [date] if date else []
    if not run_script("news_classifier.py", classifier_args):
        print("  ❌ 分类器失败")
        ok = False

    print("\n" + "=" * 60)
    if ok:
        print("✅ 全部完成！")
    else:
        print("⚠️ 部分步骤失败，请检查上方日志")
    print("=" * 60)

    output_dir = SCRIPT_DIR.parent / "output" / "news"
    today = date or datetime.now().strftime("%Y-%m-%d")
    md_path = output_dir / f"changes_{today}.md"
    if md_path.exists():
        print(f"\n📄 变更清单: {md_path}")


if __name__ == "__main__":
    main()
