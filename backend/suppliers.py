import json
import os

CATALOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "supplier_catalog.json")

with open(CATALOG_PATH) as f:
    suppliers = json.load(f)
