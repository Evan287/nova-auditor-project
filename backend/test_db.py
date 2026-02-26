from tools.inventory_tools import fetch_low_stock_report
print("--- Testing Database Tool")
report = fetch_low_stock_report()
print(report)