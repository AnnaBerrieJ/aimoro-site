import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from dotenv import load_dotenv
from PIL import Image
import base64
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(REPO_ROOT, ".env"))


def get_openai_key():
    """Reads the OpenAI key from the environment (local dev, .env) or
    from Streamlit secrets (Streamlit Community Cloud deployment)."""
    key = os.getenv("OPENAI_API_KEY")
    if key:
        return key
    try:
        return st.secrets["OPENAI_API_KEY"]
    except Exception:
        return None


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
SUPPLIERS_URL = f"{API_BASE_URL}/suppliers"
LOGO_PATH = "assets/AimoroLogo.png"

# Brand palette, reused across custom HTML badges and chart color maps so
# the two stay in sync.
PLATFORM_COLORS = {"Alibaba": "#c40000", "AliExpress": "#111827"}
RISK_COLORS = {"Low Risk": "#15803d", "Medium Risk": "#b45309", "High Risk": "#b91c1c"}
RISK_BADGE_COLOR = {"Low Risk": "green", "Medium Risk": "orange", "High Risk": "red"}

px.defaults.template = "simple_white"

st.set_page_config(
    page_title="Aimoro Smart Sourcing",
    page_icon=Image.open(LOGO_PATH),
    layout="wide"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
}

.stApp {
    background: radial-gradient(circle at 14% 0%, #fff3f3 0%, #f8fafc 42%);
}

[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #ffffff 0%, #fff7f7 100%);
    border-right: 1px solid #f1d0d0;
}

[data-testid="stSidebar"] img {
    border-radius: 12px;
    margin-bottom: 10px;
}

.aimoro-title {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #111827;
    margin-bottom: 0;
}

.aimoro-subtitle {
    color: #6b7280;
    font-size: 16.5px;
    font-weight: 500;
    margin-top: 4px;
}

/* ---------- Cards ---------- */
div[data-testid="stVerticalBlockBorderWrapper"] {
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #e5e7eb;
    box-shadow: 0px 10px 28px rgba(17, 24, 39, 0.05);
    margin-bottom: 18px;
    position: relative;
    overflow: hidden;
    transition: box-shadow 200ms ease, transform 200ms ease;
}

div[data-testid="stVerticalBlockBorderWrapper"]::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #c40000, #ff5a5a 55%, #c40000);
}

div[data-testid="stVerticalBlockBorderWrapper"]:hover {
    box-shadow: 0px 16px 36px rgba(17, 24, 39, 0.09);
    transform: translateY(-2px);
}

.best-match {
    background: linear-gradient(90deg, #c40000, #950000);
    color: white;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.01em;
    display: inline-block;
    margin-bottom: 12px;
    box-shadow: 0 6px 16px rgba(196, 0, 0, 0.28);
}

.platform-badge {
    background: #fff1f1;
    color: #c40000;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    border: 1px solid rgba(196, 0, 0, 0.12);
}

.score-box {
    padding: 18px 12px;
    border-radius: 16px;
    text-align: center;
    font-weight: 800;
    font-size: 26px;
    border: 1px solid;
    box-shadow: 0px 8px 20px rgba(17, 24, 39, 0.05);
}

.score-high {
    background: linear-gradient(180deg, #ecfdf5, #ffffff);
    border-color: #86efac;
    color: #15803d;
}

.score-medium {
    background: linear-gradient(180deg, #fffbeb, #ffffff);
    border-color: #fcd34d;
    color: #b45309;
}

.score-low {
    background: linear-gradient(180deg, #fef2f2, #ffffff);
    border-color: #fca5a5;
    color: #b91c1c;
}

/* ---------- Buttons (main content) ---------- */
.stButton > button {
    background: linear-gradient(90deg, #c40000, #950000);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 10px 18px;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(196, 0, 0, 0.22);
    transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.stButton > button:hover {
    color: white;
    transform: translateY(-1px);
    filter: brightness(1.05);
    box-shadow: 0 10px 24px rgba(196, 0, 0, 0.3);
}

[data-testid="stMetric"] {
    background: #ffffff;
    padding: 20px;
    border-radius: 18px;
    border: 1px solid #f1d0d0;
    box-shadow: 0px 10px 24px rgba(17, 24, 39, 0.05);
    position: relative;
    overflow: hidden;
}

[data-testid="stMetric"]::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #c40000, #ff5a5a 55%, #c40000);
}

/* Let metric labels wrap onto two lines instead of truncating with an
   ellipsis when the card is narrower than the label text. */
[data-testid="stMetricLabel"] {
    white-space: normal !important;
    overflow: visible !important;
    line-height: 1.3 !important;
}

[data-testid="stMetricLabel"] p {
    white-space: normal !important;
    overflow-wrap: break-word !important;
}

/* ---------- Sidebar navigation ---------- */
section[data-testid="stSidebar"] div.stButton > button[kind="secondary"] {
    background: transparent !important;
    color: #374151 !important;
    border: 1px solid transparent !important;
    box-shadow: none !important;
    font-weight: 600 !important;
    text-align: left !important;
    justify-content: flex-start !important;
    padding-left: 14px !important;
    transform: none !important;
}

section[data-testid="stSidebar"] div.stButton > button[kind="secondary"]:hover {
    background: #fff1f1 !important;
    color: #c40000 !important;
    transform: none !important;
    box-shadow: none !important;
}

section[data-testid="stSidebar"] div.stButton > button[kind="primary"] {
    background: linear-gradient(90deg, #c40000, #950000) !important;
    color: #ffffff !important;
    box-shadow: 0 8px 20px rgba(196, 0, 0, 0.28) !important;
    text-align: left !important;
    justify-content: flex-start !important;
    padding-left: 14px !important;
}

/* ---------- Dashboard: hero ---------- */
.hero-panel {
    background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
    border: 1px solid #f1d0d0;
    border-radius: 22px;
    padding: 34px 38px;
    margin-bottom: 26px;
    box-shadow: 0px 14px 34px rgba(17, 24, 39, 0.06);
}

.hero-eyebrow {
    display: inline-block;
    background: #fff1f1;
    color: #c40000;
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 999px;
    margin-bottom: 14px;
}

.hero-heading {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #111827;
    margin: 0 0 12px 0;
}

.hero-copy {
    font-size: 16px;
    color: #4b5563;
    line-height: 1.65;
    max-width: 780px;
    margin: 0;
}

.section-heading {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
    margin: 30px 0 14px 0;
}

.step-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 22px 20px;
    height: 100%;
    box-shadow: 0px 10px 24px rgba(17, 24, 39, 0.04);
}

.step-number {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: linear-gradient(135deg, #c40000, #950000);
    color: #ffffff;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
}

.step-title {
    font-weight: 700;
    font-size: 16px;
    color: #111827;
    margin-bottom: 6px;
}

.step-copy {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.55;
}
</style>
""", unsafe_allow_html=True)


def get_score_tier(score):
    if score >= 70:
        return "score-high"
    if score >= 45:
        return "score-medium"
    return "score-low"


def save_supplier(supplier):
    response = requests.post(f"{API_BASE_URL}/save-supplier/{supplier['id']}")

    if response.status_code == 200:
        get_saved_suppliers.clear()
        st.success(f"{supplier['name']} saved.")
    else:
        st.error("Could not save supplier.")


@st.cache_data(ttl=30)
def get_saved_suppliers():
    try:
        response = requests.get(f"{API_BASE_URL}/saved-suppliers")
        if response.status_code == 200:
            return response.json()
    except requests.exceptions.RequestException:
        return []

    return []


@st.cache_data(ttl=60)
def get_catalog_snapshot():
    """Fetches the full unfiltered supplier catalog, used only to power
    Dashboard stats (total suppliers, verified count, platforms)."""
    try:
        response = requests.get(
            SUPPLIERS_URL,
            params={"product": "", "country": "", "max_price": 999999, "verified": False}
        )
        if response.status_code == 200:
            return response.json()
    except requests.exceptions.RequestException:
        return []

    return []


def delete_saved_supplier(saved_id):
    response = requests.delete(f"{API_BASE_URL}/saved-suppliers/{saved_id}")

    if response.status_code == 200:
        get_saved_suppliers.clear()
        st.success("Supplier deleted.")
    else:
        st.error("Could not delete supplier.")


def build_comparison_df(suppliers):
    comparison_data = []

    for supplier in suppliers:
        comparison_data.append({
            "Supplier": supplier["name"],
            "Platform": supplier["platform"],
            "Country": supplier["country"],
            "Price": supplier["unit_price"],
            "MOQ": supplier["minimum_order_quantity"],
            "Rating": supplier["rating"],
            "Delivery Days": supplier["delivery_days"],
            "Risk": supplier["risk_level"],
            "Score": supplier["aimoro_score"]
        })

    return pd.DataFrame(comparison_data)


def render_dashboard(saved_suppliers):
    catalog = get_catalog_snapshot()
    total_catalog = len(catalog)
    verified_catalog = len([s for s in catalog if s["verified"]])
    platforms_covered = len(set(s["platform"] for s in catalog)) if catalog else 0

    st.markdown(
        """
        <div class="hero-panel">
            <span class="hero-eyebrow">AI-Powered Sourcing Intelligence</span>
            <h1 class="hero-heading">Source smarter from Alibaba &amp; AliExpress</h1>
            <p class="hero-copy">
                Aimoro searches, scores, and risk-checks suppliers across both
                platforms in seconds, then helps you negotiate better terms
                with an AI-drafted message. Compare offers side by side, save
                the ones worth pursuing, and move from research to outreach
                without leaving the app.
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Suppliers in Catalog", total_catalog if catalog else "—")
    col2.metric("Verified Suppliers", verified_catalog if catalog else "—")
    col3.metric("Platforms Covered", platforms_covered if catalog else "—")
    col4.metric("Saved by You", len(saved_suppliers))

    if not catalog:
        st.warning(
            "Backend is not running, so live catalog stats aren't available. "
            "Start FastAPI to see real numbers here."
        )

    st.markdown('<div class="section-heading">How Aimoro Works</div>', unsafe_allow_html=True)

    steps = [
        ("1", "Search &amp; Score", "Enter a product, country, and price target. Aimoro's ML model ranks every match by price, rating, delivery speed, and verification."),
        ("2", "Compare &amp; Save", "Review suppliers side by side with risk levels and plain-language recommendations, then shortlist the strongest candidates."),
        ("3", "Negotiate with AI", "Aimoro AI drafts a professional negotiation message using your target price and terms — you review, edit, and send it yourself."),
    ]

    step_cols = st.columns(3)
    for col, (num, title, copy) in zip(step_cols, steps):
        with col:
            st.markdown(
                f"""
                <div class="step-card">
                    <div class="step-number">{num}</div>
                    <div class="step-title">{title}</div>
                    <div class="step-copy">{copy}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown('<div class="section-heading">Jump Back In</div>', unsafe_allow_html=True)

    quick_links = [
        ("Find Suppliers", "Run a new sourcing search"),
        ("Saved Suppliers", f"{len(saved_suppliers)} shortlisted"),
        ("Analytics", "Review saved-supplier trends"),
        ("Negotiate", "Draft an AI negotiation message"),
    ]

    link_cols = st.columns(4)
    for col, (label, caption) in zip(link_cols, quick_links):
        with col:
            st.caption(caption)
            if st.button(label, key=f"quicklink_{label}", use_container_width=True):
                st.session_state.page = label
                st.rerun()


if "page" not in st.session_state:
    st.session_state.page = "Dashboard"

@st.cache_data
def _load_logo_b64():
    return base64.b64encode(open(LOGO_PATH, "rb").read()).decode()

_logo_b64 = _load_logo_b64()

st.markdown(
    f"""
    <style>
    section[data-testid="stSidebar"] .st-key-logo_home button {{
        background-image: url("data:image/png;base64,{_logo_b64}") !important;
        background-size: 38px 38px !important;
        background-repeat: no-repeat !important;
        background-position: 10px center !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        height: 58px !important;
        min-height: 58px !important;
        padding-left: 60px !important;
        text-align: left !important;
        justify-content: flex-start !important;
        transition: opacity 160ms ease;
    }}

    section[data-testid="stSidebar"] .st-key-logo_home button:hover {{
        opacity: 0.75 !important;
        background-color: transparent !important;
    }}

    section[data-testid="stSidebar"] .st-key-logo_home button p {{
        font-size: 16px !important;
        font-weight: 800 !important;
        color: #111827 !important;
    }}
    </style>
    """,
    unsafe_allow_html=True
)

nav_items = [
    "Dashboard",
    "Find Suppliers",
    "Saved Suppliers",
    "Analytics",
    "Negotiate",
    "AI Assistant",
]

with st.sidebar:
    with st.container(key="logo_home"):
        if st.button(
            "Aimoro Smart Sourcing",
            key="logo_home_btn",
            use_container_width=True,
            help="Go to Dashboard",
        ):
            st.session_state.page = "Dashboard"
            st.rerun()

    st.markdown("### Navigation")

    for item in nav_items:
        is_active = st.session_state.page == item
        if st.button(
            item,
            key=f"nav_{item}",
            use_container_width=True,
            type="primary" if is_active else "secondary",
        ):
            st.session_state.page = item
            st.rerun()

    st.divider()
    st.markdown("### Aimoro")
    st.write("Innovate. Elevate. Dominate.")

page = st.session_state.page

if page != "Dashboard":
    st.markdown(
        '<p class="aimoro-title">Welcome back!</p>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<p class="aimoro-subtitle">Find, compare, and save Alibaba/AliExpress suppliers.</p>',
        unsafe_allow_html=True
    )

saved_suppliers = get_saved_suppliers()


if page == "Dashboard":
    render_dashboard(saved_suppliers)

elif page == "Find Suppliers":
    st.subheader("Find the Best Suppliers")

    col1, col2, col3, col4 = st.columns([2, 1.5, 1.5, 1])

    with col1:
        product = st.text_input("Product", value="Wireless Headphones")

    with col2:
        country = st.text_input("Country", value="China")

    with col3:
        max_price = st.number_input("Target Price", min_value=0.0, value=100.0)

    with col4:
        verified = st.checkbox("Verified only")

    search_button = st.button("Search Suppliers")

    if search_button:
        params = {
            "product": product,
            "country": country,
            "max_price": max_price,
            "verified": verified
        }

        try:
            response = requests.get(SUPPLIERS_URL, params=params)
            response.raise_for_status()
            suppliers = response.json()

            total_suppliers = len(suppliers)
            verified_count = len([s for s in suppliers if s["verified"]])
            average_price = (
                sum(s["unit_price"] for s in suppliers) / total_suppliers
                if total_suppliers > 0
                else 0
            )
            best_score = suppliers[0]["aimoro_score"] if suppliers else 0

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total Suppliers", total_suppliers)
            col2.metric("Verified Suppliers", verified_count)
            col3.metric("Average Price", f"${average_price:.2f}")
            col4.metric("Best Match Score", f"{best_score}%")

            st.divider()

            if total_suppliers == 0:
                st.warning("No suppliers found.")
            else:
                comparison_df = build_comparison_df(suppliers)

                tab1, tab2, tab3 = st.tabs([
                    "Supplier Results",
                    "Comparison Table",
                    "Analytics"
                ])

                with tab1:
                    st.subheader("Top Supplier Matches")

                    for index, supplier in enumerate(suppliers):
                        with st.container(border=True):
                            if index == 0:
                                st.markdown(
                                    '<span class="best-match">Best Match</span>',
                                    unsafe_allow_html=True
                                )

                            left, middle, score_col, action_col = st.columns(
                                [2.5, 3, 1.2, 1.5]
                            )

                            with left:
                                st.markdown(
                                    f"<span class='platform-badge'>{supplier['platform']}</span>",
                                    unsafe_allow_html=True
                                )
                                st.subheader(supplier["name"])
                                st.write(
                                    f"{supplier['country']} · {supplier['product']}"
                                )

                            with middle:
                                c1, c2, c3, c4 = st.columns(4)

                                c1.write(f"**${supplier['unit_price']}**")
                                c1.caption("Unit Price")

                                c2.write(f"**{supplier['minimum_order_quantity']}**")
                                c2.caption("MOQ")

                                c3.write(f"**{supplier['rating']}**")
                                c3.caption("Rating")

                                c4.write(f"**{supplier['delivery_days']} Days**")
                                c4.caption("Delivery")

                                st.write("**Risk**")
                                st.badge(
                                    supplier["risk_level"],
                                    color=RISK_BADGE_COLOR[supplier["risk_level"]]
                                )
                                st.info(supplier["recommendation"])

                            with score_col:
                                tier = get_score_tier(supplier["aimoro_score"])
                                st.markdown(
                                    f"""
                                    <div class='score-box {tier}'>
                                        {supplier['aimoro_score']}%<br>
                                        <small>Match Score</small>
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )

                            with action_col:
                                if st.button("Save", key=f"save_{supplier['id']}"):
                                    save_supplier(supplier)

                                st.link_button(
                                    f"View on {supplier['platform']}",
                                    supplier["supplier_url"]
                                )

                with tab2:
                    st.subheader("Supplier Comparison Table")

                    st.dataframe(
                        comparison_df,
                        hide_index=True,
                        width="stretch",
                        column_config={
                            "Score": st.column_config.ProgressColumn(
                                "Score", min_value=0, max_value=100, format="%.1f"
                            )
                        }
                    )

                with tab3:
                    st.subheader("Supplier Price Comparison")

                    price_chart = px.bar(
                        comparison_df,
                        x="Supplier",
                        y="Price",
                        color="Platform",
                        color_discrete_map=PLATFORM_COLORS,
                        text="Price"
                    )

                    st.plotly_chart(
                        price_chart,
                        width="stretch"
                    )

                    st.subheader("Supplier Match Scores")

                    score_chart = px.bar(
                        comparison_df,
                        x="Supplier",
                        y="Score",
                        color="Risk",
                        color_discrete_map=RISK_COLORS,
                        text="Score"
                    )

                    st.plotly_chart(
                        score_chart,
                        width="stretch"
                    )

                    st.subheader("Platform Distribution")

                    platform_chart = px.pie(
                        comparison_df,
                        names="Platform",
                        color="Platform",
                        color_discrete_map=PLATFORM_COLORS
                    )

                    st.plotly_chart(
                        platform_chart,
                        width="stretch"
                    )

                    st.subheader("Risk Distribution")

                    risk_chart = px.histogram(
                        comparison_df,
                        x="Risk",
                        color="Risk",
                        color_discrete_map=RISK_COLORS
                    )

                    st.plotly_chart(
                        risk_chart,
                        width="stretch"
                    )

        except requests.exceptions.ConnectionError:
            st.error("Backend is not running. Start FastAPI first.")

        except requests.exceptions.RequestException as error:
            st.error(f"Something went wrong: {error}")

    else:
        st.info("Search suppliers using the form above.")


elif page == "Saved Suppliers":
    st.subheader("Saved Suppliers")

    if len(saved_suppliers) == 0:
        st.info("No saved suppliers yet.")
    else:
        for supplier in saved_suppliers:
            with st.container(border=True):
                st.markdown(f"**{supplier['name']}**")
                st.caption(
                    f"{supplier['platform']} · {supplier['country']} · "
                    f"{supplier['product']} · ${supplier['unit_price']} · "
                    f"MOQ {supplier['minimum_order_quantity']} · "
                    f"{supplier['delivery_days']} days · "
                    f"Rating {supplier['rating']}"
                    + (" · Verified" if supplier["verified"] else "")
                )

                col1, col2 = st.columns([1, 4])

                with col1:
                    if st.button(
                        f"Delete {supplier['name']}",
                        key=f"delete_{supplier['id']}"
                    ):
                        delete_saved_supplier(supplier["id"])
                        st.rerun()

                with col2:
                    if supplier["supplier_url"]:
                        st.link_button(
                            f"View on {supplier['platform']}",
                            supplier["supplier_url"]
                        )


elif page == "Analytics":
    st.subheader("Saved Supplier Analytics")

    if len(saved_suppliers) == 0:
        st.info("Save suppliers first to see analytics here.")
    else:
        saved_df = pd.DataFrame(saved_suppliers)

        col1, col2, col3 = st.columns(3)
        col1.metric("Saved Suppliers", len(saved_suppliers))
        col2.metric("Active Platforms", saved_df["platform"].nunique())
        col3.metric("Average Saved Price", f"${saved_df['unit_price'].mean():.2f}")

        st.dataframe(saved_df, hide_index=True, width="stretch")

        platform_chart = px.pie(
            saved_df,
            names="platform",
            color="platform",
            color_discrete_map=PLATFORM_COLORS,
            title="Saved Suppliers by Platform"
        )

        st.plotly_chart(platform_chart, width="stretch")

        price_chart = px.bar(
            saved_df,
            x="name",
            y="unit_price",
            color="platform",
            color_discrete_map=PLATFORM_COLORS,
            title="Saved Supplier Prices"
        )

        st.plotly_chart(price_chart, width="stretch")


elif page == "Negotiate":

    from openai import OpenAI

    OPENAI_API_KEY = get_openai_key()

    if not OPENAI_API_KEY:
        st.error("Missing OPENAI_API_KEY. Set it in .env (local) or Streamlit secrets (cloud).")
        st.stop()

    client = OpenAI(api_key=OPENAI_API_KEY)

    st.subheader("Negotiation Assistant")
    st.write(
        "Aimoro AI drafts a negotiation message based on a saved supplier's "
        "listing and your target terms. Review and edit it, then send it "
        "yourself — Aimoro doesn't contact suppliers directly."
    )

    if len(saved_suppliers) == 0:
        st.info("Save a supplier first (Find Suppliers → Save) to negotiate with them.")
    else:
        supplier_options = {
            f"{s['name']} ({s['platform']}, ${s['unit_price']})": s
            for s in saved_suppliers
        }
        selected_label = st.selectbox("Supplier", list(supplier_options.keys()))
        supplier = supplier_options[selected_label]

        col1, col2, col3 = st.columns(3)

        with col1:
            target_price = st.number_input(
                "Target unit price ($)",
                min_value=0.01,
                value=round(max(supplier["unit_price"] * 0.85, 0.01), 2)
            )

        with col2:
            order_quantity = st.number_input("Order quantity", min_value=1, value=500)

        with col3:
            target_delivery_days = st.number_input(
                "Target delivery (days)", min_value=1, value=14
            )

        notes = st.text_area(
            "Additional asks or context (optional)",
            placeholder="e.g. first-time buyer, want a sample before committing, looking for a long-term partner"
        )

        if st.button("Draft Negotiation Message"):
            with st.spinner("Drafting message..."):
                try:
                    completion = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "system",
                                "content": """
                                You are Aimoro AI, drafting a negotiation email from
                                a buyer to a supplier on Alibaba/AliExpress. Write a
                                polite, professional, and firm message that:
                                - references the supplier's current listing
                                - states the buyer's target price, order quantity,
                                  and delivery timeline as a clear ask
                                - gives the supplier a reason to agree (order
                                  volume, potential for repeat business, etc.)
                                - ends with a clear call to action requesting a
                                  reply

                                Keep it under 200 words. Output only the message
                                text, ready to copy and send, with no commentary
                                before or after it.
                                """
                            },
                            {
                                "role": "user",
                                "content": (
                                    f"Supplier: {supplier['name']} on {supplier['platform']}\n"
                                    f"Listed unit price: ${supplier['unit_price']}\n"
                                    f"Listed MOQ: {supplier['minimum_order_quantity']}\n"
                                    f"Listed delivery: {supplier['delivery_days']} days\n"
                                    f"Rating: {supplier['rating']}, "
                                    f"Verified: {bool(supplier['verified'])}\n\n"
                                    f"My target unit price: ${target_price}\n"
                                    f"My order quantity: {order_quantity}\n"
                                    f"My target delivery: {target_delivery_days} days\n"
                                    f"Additional notes: {notes or 'none'}"
                                )
                            }
                        ]
                    )

                    st.session_state["negotiation_draft"] = completion.choices[0].message.content

                except Exception as error:
                    st.error(f"AI Error: {error}")

        if "negotiation_draft" in st.session_state:
            st.text_area(
                "Drafted message (edit before sending)",
                value=st.session_state["negotiation_draft"],
                height=250,
                key="negotiation_draft_editable"
            )
            st.caption(
                "Copy this into an email or the platform's messaging tool to "
                "send it yourself."
            )


elif page == "AI Assistant":

    from openai import OpenAI

    OPENAI_API_KEY = get_openai_key()

    if not OPENAI_API_KEY:
        st.error("Missing OPENAI_API_KEY. Set it in .env (local) or Streamlit secrets (cloud).")
        st.stop()

    client = OpenAI(api_key=OPENAI_API_KEY)

    st.subheader("Aimoro AI Sourcing Assistant")

    st.write(
        "Ask sourcing questions about suppliers, pricing, negotiation, "
        "Alibaba, AliExpress, ecommerce, and supplier risks."
    )

    question = st.text_area(
        "Ask Aimoro AI",
        placeholder="Example: Which supplier is safest for a beginner ecommerce business?"
    )

    if st.button("Ask Aimoro AI"):

        if question.strip() == "":
            st.warning("Please enter a question.")

        else:
            with st.spinner("Analyzing suppliers..."):

                try:
                    completion = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "system",
                                "content": """
                                You are Aimoro AI, an expert sourcing assistant.

                                Your job:
                                - analyze suppliers
                                - compare Alibaba vs AliExpress
                                - explain sourcing risks
                                - help ecommerce founders
                                - help users negotiate pricing
                                - recommend suppliers
                                - provide sourcing advice

                                Keep responses concise and professional.
                                """
                            },
                            {
                                "role": "user",
                                "content": question
                            }
                        ]
                    )

                    ai_response = completion.choices[0].message.content

                    st.success(ai_response)

                except Exception as error:
                    st.error(f"AI Error: {error}")