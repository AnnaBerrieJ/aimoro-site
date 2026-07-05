import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=".env")


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
LOGO_PATH = "assets/AimoroLogo.PNG"

st.set_page_config(
    page_title="Aimoro Smart Sourcing",
    page_icon="🚀",
    layout="wide"
)

st.markdown("""
<style>
.main {
    background-color: #f8fafc;
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
    font-size: 34px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 0;
}

.aimoro-subtitle {
    color: #6b7280;
    font-size: 16px;
    margin-top: 4px;
}

.supplier-card {
    background: #ffffff;
    padding: 24px;
    border-radius: 18px;
    border: 1px solid #e5e7eb;
    box-shadow: 0px 6px 20px rgba(0,0,0,0.04);
    margin-bottom: 18px;
}

.best-match {
    background: #c40000;
    color: white;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 700;
    display: inline-block;
    margin-bottom: 12px;
}

.platform-badge {
    background: #fff1f1;
    color: #c40000;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}

.score-box {
    background: #ecfdf5;
    border: 1px solid #86efac;
    color: #15803d;
    padding: 16px;
    border-radius: 14px;
    text-align: center;
    font-weight: 800;
    font-size: 26px;
}

.stButton > button {
    background: #c40000;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 10px 18px;
    font-weight: 700;
}

.stButton > button:hover {
    background: #990000;
    color: white;
}

[data-testid="stMetric"] {
    background: #ffffff;
    padding: 20px;
    border-radius: 18px;
    border: 1px solid #f1d0d0;
    box-shadow: 0px 6px 20px rgba(0,0,0,0.05);
}
</style>
""", unsafe_allow_html=True)


def get_risk_badge(risk_level):
    if risk_level == "Low Risk":
        return "🟢 Low Risk"
    if risk_level == "Medium Risk":
        return "🟡 Medium Risk"
    return "🔴 High Risk"


def save_supplier(supplier):
    response = requests.post(f"{API_BASE_URL}/save-supplier/{supplier['id']}")

    if response.status_code == 200:
        st.success(f"{supplier['name']} saved.")
    else:
        st.error("Could not save supplier.")


def get_saved_suppliers():
    try:
        response = requests.get(f"{API_BASE_URL}/saved-suppliers")
        if response.status_code == 200:
            return response.json()
    except requests.exceptions.RequestException:
        return []

    return []


def delete_saved_supplier(saved_id):
    response = requests.delete(f"{API_BASE_URL}/saved-suppliers/{saved_id}")

    if response.status_code == 200:
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


with st.sidebar:
    st.image(LOGO_PATH, use_container_width=True)

    st.markdown("### Navigation")
    page = st.selectbox(
        "Navigation",
        [
            "Dashboard",
            "Find Suppliers",
            "Saved Suppliers",
            "Analytics",
            "AI Assistant"
        ],
        label_visibility="collapsed"
    )

    st.divider()
    st.markdown("### Aimoro")
    st.write("Innovate. Elevate. Dominate.")


st.markdown(
    '<p class="aimoro-title">Welcome back! 👋</p>',
    unsafe_allow_html=True
)

st.markdown(
    '<p class="aimoro-subtitle">Find, compare, and save Alibaba/AliExpress suppliers.</p>',
    unsafe_allow_html=True
)

saved_suppliers = get_saved_suppliers()


if page in ["Dashboard", "Find Suppliers"]:
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
                        st.markdown(
                            '<div class="supplier-card">',
                            unsafe_allow_html=True
                        )

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
                                f"📍 {supplier['country']} · {supplier['product']}"
                            )

                        with middle:
                            c1, c2, c3, c4 = st.columns(4)

                            c1.write(f"**${supplier['unit_price']}**")
                            c1.caption("Unit Price")

                            c2.write(f"**{supplier['minimum_order_quantity']}**")
                            c2.caption("MOQ")

                            c3.write(f"**⭐ {supplier['rating']}**")
                            c3.caption("Rating")

                            c4.write(f"**{supplier['delivery_days']} Days**")
                            c4.caption("Delivery")

                            st.write(
                                f"**Risk:** {get_risk_badge(supplier['risk_level'])}"
                            )
                            st.info(supplier["recommendation"])

                        with score_col:
                            st.markdown(
                                f"""
                                <div class='score-box'>
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

                        st.markdown("</div>", unsafe_allow_html=True)

                with tab2:
                    st.subheader("Supplier Comparison Table")

                    st.dataframe(
                        comparison_df,
                        use_container_width=True
                    )

                with tab3:
                    st.subheader("Supplier Price Comparison")

                    price_chart = px.bar(
                        comparison_df,
                        x="Supplier",
                        y="Price",
                        color="Platform",
                        text="Price"
                    )

                    st.plotly_chart(
                        price_chart,
                        use_container_width=True
                    )

                    st.subheader("Supplier Match Scores")

                    score_chart = px.bar(
                        comparison_df,
                        x="Supplier",
                        y="Score",
                        color="Risk",
                        text="Score"
                    )

                    st.plotly_chart(
                        score_chart,
                        use_container_width=True
                    )

                    st.subheader("Platform Distribution")

                    platform_chart = px.pie(
                        comparison_df,
                        names="Platform"
                    )

                    st.plotly_chart(
                        platform_chart,
                        use_container_width=True
                    )

                    st.subheader("Risk Distribution")

                    risk_chart = px.histogram(
                        comparison_df,
                        x="Risk",
                        color="Risk"
                    )

                    st.plotly_chart(
                        risk_chart,
                        use_container_width=True
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
                st.write(
                    f"✅ **{supplier['name']}** | {supplier['platform']} | "
                    f"{supplier['country']} | {supplier['product']} | "
                    f"${supplier['unit_price']} | Rating: {supplier['rating']}"
                )

                if st.button(
                    f"Delete {supplier['name']}",
                    key=f"delete_{supplier['id']}"
                ):
                    delete_saved_supplier(supplier["id"])
                    st.rerun()


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

        st.dataframe(saved_df, use_container_width=True)

        platform_chart = px.pie(
            saved_df,
            names="platform",
            title="Saved Suppliers by Platform"
        )

        st.plotly_chart(platform_chart, use_container_width=True)

        price_chart = px.bar(
            saved_df,
            x="name",
            y="unit_price",
            color="platform",
            title="Saved Supplier Prices"
        )

        st.plotly_chart(price_chart, use_container_width=True)


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