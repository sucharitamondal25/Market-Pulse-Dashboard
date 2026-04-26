"""
auto_update.py
--------------
Fully automated daily OHLCV update with auto token refresh.

- Uses refresh_token to generate new access_token daily (no browser login)
- Refresh token is valid for 15 days
- After 15 days it will ask you to log in once to get a new refresh token
- Run this via Windows Task Scheduler at 4:00 PM daily
- Each per-symbol CSV now includes a `shares` column (loaded from TICKER_fyers.csv)
  so market_cap can be computed as:  close * shares

Usage:
    python auto_update.py

First run:
    It will ask you to log in via browser once to get the refresh token.
    After that it runs fully automatically for 15 days.
"""

import os
import sys
import time
import json
import logging
import urllib.parse as urlparse
import pandas as pd
from datetime import datetime, timedelta
from fyers_apiv3 import fyersModel
from fyers_apiv3.fyersModel import SessionModel

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────
APP_ID        = "V4LJOBSB2A-100"
SECRET_KEY    = "IBQ36F606F"
REDIRECT_URI  = "https://trade.fyers.in/api-login/redirect-uri/index.html"
RESPONSE_TYPE = "code"
GRANT_TYPE    = "authorization_code"

RESOLUTION    = "D"
SYM_DIR       = os.path.join("ohlcv_data", "per_symbol")
TOKEN_FILE    = "tokens.json"       # stores both access + refresh token
TICKER_FILE   = "TICKER_fyers.csv"  # source of share counts
REQUEST_DELAY = 0.2

# ─────────────────────────────────────────────────────────────
#  LOAD SHARES MAPPING  { "NSE:AWFIS-EQ": 71255110, ... }
# ─────────────────────────────────────────────────────────────
def load_shares_map(ticker_file: str = TICKER_FILE) -> dict:
    """
    Reads TICKER_fyers.csv and returns a dict mapping Fyers symbol
    to number of shares (integer).  Falls back to empty dict if the
    file is missing so the rest of the script still works.
    """
    if not os.path.exists(ticker_file):
        logging.getLogger(__name__).warning(
            "Ticker file '%s' not found – shares column will be omitted.", ticker_file
        )
        return {}
    df = pd.read_csv(ticker_file)
    # Column name has a double-space: 'No OF  SHARE'
    share_col = [c for c in df.columns if "SHARE" in c.upper()]
    if not share_col:
        logging.getLogger(__name__).warning(
            "No share-count column found in '%s'.", ticker_file
        )
        return {}
    col = share_col[0]
    shares_map = {
        row["Fyers_Symbol"]: int(round(row[col]))
        for _, row in df.iterrows()
        if pd.notna(row[col])
    }
    logging.getLogger(__name__).info(
        "Loaded share counts for %d symbols from '%s'.", len(shares_map), ticker_file
    )
    return shares_map


# ─────────────────────────────────────────────────────────────
#  749 NSE SYMBOLS
# ─────────────────────────────────────────────────────────────
SYMBOLS = [
    "NSE:AWFIS-EQ",
    "NSE:QUESS-EQ",
    "NSE:ORIENTCEM-EQ",
    "NSE:SHAREINDIA-EQ",
    "NSE:ROUTE-EQ",
    "NSE:MSTCLTD-EQ",
    "NSE:HERITGFOOD-EQ",
    "NSE:REFEX-EQ",
    "NSE:AARTIDRUGS-EQ",
    "NSE:KITEX-EQ",
    "NSE:ADVENZYMES-EQ",
    "NSE:KNRCON-EQ",
    "NSE:ZAGGLE-EQ",
    "NSE:CIGNITITEC-EQ",
    "NSE:SAMHI-EQ",
    "NSE:OPTIEMUS-EQ",
    "NSE:ELLEN-EQ",
    "NSE:RBA-EQ",
    "NSE:BALAMINES-EQ",
    "NSE:VAIBHAVGBL-EQ",
    "NSE:EIEL-EQ",
    "NSE:GREAVESCOT-EQ",
    "NSE:HEMIPROP-EQ",
    "NSE:NFL-EQ",
    "NSE:STYL-EQ",
    "NSE:ASHOKA-EQ",
    "NSE:STYRENIX-EQ",
    "NSE:LXCHEM-EQ",
    "NSE:WEBELSOLAR-EQ",
    "NSE:NEOGEN-EQ",
    "NSE:INDIGOPNTS-EQ",
    "NSE:TARC-EQ",
    "NSE:CRIZAC-EQ",
    "NSE:EMIL-EQ",
    "NSE:HGINFRA-EQ",
    "NSE:ANUP-EQ",
    "NSE:JSFB-EQ",
    "NSE:GMMPFAUDLR-EQ",
    "NSE:TEXRAIL-EQ",
    "NSE:DATAMATICS-EQ",
    "NSE:RAIN-EQ",
    "NSE:CAPILLARY-EQ",
    "NSE:BAJAJELEC-EQ",
    "NSE:IFBIND-EQ",
    "NSE:SWSOLAR-EQ",
    "NSE:VIPIND-EQ",
    "NSE:JUSTDIAL-EQ",
    "NSE:GHCL-EQ",
    "NSE:KSCL-EQ",
    "NSE:RTNINDIA-EQ",
    "NSE:SPARC-EQ",
    "NSE:VMART-EQ",
    "NSE:RAYMONDLSL-EQ",
    "NSE:SKIPPER-EQ",
    "NSE:WAKEFIT-EQ",
    "NSE:SUNTECK-EQ",
    "NSE:OSWALPUMPS-EQ",
    "NSE:SMARTWORKS-EQ",
    "NSE:ELECTCAST-EQ",
    "NSE:HCC-EQ",
    "NSE:AURIONPRO-EQ",
    "NSE:TVSSCS-EQ",
    "NSE:SUBROS-EQ",
    "NSE:SUPRIYA-EQ",
    "NSE:JAMNAAUTO-EQ",
    "NSE:SURYAROSNI-EQ",
    "NSE:RALLIS-EQ",
    "NSE:THOMASCOOK-EQ",
    "NSE:PNCINFRA-EQ",
    "NSE:MAPMYINDIA-EQ",
    "NSE:CMSINFO-EQ",
    "NSE:RTNPOWER-EQ",
    "NSE:CCAVENUE-EQ",
    "NSE:GOKEX-EQ",
    "NSE:PURVA-EQ",
    "NSE:SENCO-EQ",
    "NSE:MASTEK-EQ",
    "NSE:ICIL-EQ",
    "NSE:PTC-EQ",
    "NSE:FEDFINA-EQ",
    "NSE:SAPPHIRE-EQ",
    "NSE:CRAMC-EQ",
    "NSE:ENTERO-EQ",
    "NSE:AHLUCONT-EQ",
    "NSE:NETWORK18-EQ",
    "NSE:PICCADIL-EQ",
    "NSE:DBREALTY-EQ",
    "NSE:HAPPSTMNDS-EQ",
    "NSE:ASHAPURMIN-EQ",
    "NSE:IONEXCHANG-EQ",
    "NSE:BECTORFOOD-EQ",
    "NSE:BALUFORGE-EQ",
    "NSE:FIEMIND-EQ",
    "NSE:SFL-EQ",
    "NSE:RENUKA-EQ",
    "NSE:SAATVIKGL-EQ",
    "NSE:GOKULAGRO-EQ",
    "NSE:DCBBANK-EQ",
    "NSE:THYROCARE-EQ",
    "NSE:SMLMAH-EQ",
    "NSE:PRSMJOHNSN-EQ",
    "NSE:ARVINDFASN-EQ",
    "NSE:AARTIPHARM-EQ",
    "NSE:ETHOSLTD-EQ",
    "NSE:LATENTVIEW-EQ",
    "NSE:PRAJIND-EQ",
    "NSE:TANLA-EQ",
    "NSE:PARAS-EQ",
    "NSE:INDIAGLYCO-EQ",
    "NSE:INOXGREEN-EQ",
    "NSE:SKYGOLD-EQ",
    "NSE:SAREGAMA-EQ",
    "NSE:JAIBALAJI-EQ",
    "NSE:MOIL-EQ",
    "NSE:WELENT-EQ",
    "NSE:AVL-EQ",
    "NSE:REDTAPE-EQ",
    "NSE:JKPAPER-EQ",
    "NSE:GAEL-EQ",
    "NSE:LOTUSDEV-EQ",
    "NSE:SUDARSCHEM-EQ",
    "NSE:CERA-EQ",
    "NSE:NEWGEN-EQ",
    "NSE:RATEGAIN-EQ",
    "NSE:MIDHANI-EQ",
    "NSE:GSFC-EQ",
    "NSE:CSBBANK-EQ",
    "NSE:BORORENEW-EQ",
    "NSE:EMBDL-EQ",
    "NSE:DYNAMATECH-EQ",
    "NSE:V2RETAIL-EQ",
    "NSE:SHAKTIPUMP-EQ",
    "NSE:ALOKINDS-EQ",
    "NSE:PRICOLLTD-EQ",
    "NSE:GNFC-EQ",
    "NSE:WESTLIFE-EQ",
    "NSE:SUDEEPPHRM-EQ",
    "NSE:RCF-EQ",
    "NSE:YATHARTH-EQ",
    "NSE:WEWORK-EQ",
    "NSE:BLUEJET-EQ",
    "NSE:ALKYLAMINE-EQ",
    "NSE:DBL-EQ",
    "NSE:RELIGARE-EQ",
    "NSE:AVALON-EQ",
    "NSE:ACI-EQ",
    "NSE:TIPSMUSIC-EQ",
    "NSE:EPL-EQ",
    "NSE:EQUITASBNK-EQ",
    "NSE:BIRLACORPN-EQ",
    "NSE:TEJASNET-EQ",
    "NSE:POWERMECH-EQ",
    "NSE:CAMPUS-EQ",
    "NSE:PGIL-EQ",
    "NSE:RELAXO-EQ",
    "NSE:SAFARI-EQ",
    "NSE:GPPL-EQ",
    "NSE:ZEEL-EQ",
    "NSE:TRANSRAILL-EQ",
    "NSE:LLOYDSENGG-EQ",
    "NSE:ABFRL-EQ",
    "NSE:IXIGO-EQ",
    "NSE:SONATSOFTW-EQ",
    "NSE:DIACABS-EQ",
    "NSE:KRN-EQ",
    "NSE:UTLSOLAR-EQ",
    "NSE:BLUESTONE-EQ",
    "NSE:AXISCADES-EQ",
    "NSE:KRBL-EQ",
    "NSE:SHILPAMED-EQ",
    "NSE:CLEAN-EQ",
    "NSE:MARKSANS-EQ",
    "NSE:KIRLPNU-EQ",
    "NSE:VARROC-EQ",
    "NSE:VIKRAMSOLR-EQ",
    "NSE:RHIM-EQ",
    "NSE:JKLAKSHMI-EQ",
    "NSE:SKFINDIA-EQ",
    "NSE:IMFA-EQ",
    "NSE:HCG-EQ",
    "NSE:JLHL-EQ",
    "NSE:MANORAMA-EQ",
    "NSE:NESCO-EQ",
    "NSE:JSLL-EQ",
    "NSE:GMRP&UI-EQ",
    "NSE:AKUMS-EQ",
    "NSE:TRIVENI-EQ",
    "NSE:ASKAUTOLTD-EQ",
    "NSE:MAHSEAMLES-EQ",
    "NSE:WABAG-EQ",
    "NSE:SHAILY-EQ",
    "NSE:INDIASHLTR-EQ",
    "NSE:JYOTHYLAB-EQ",
    "NSE:ORKLAINDIA-EQ",
    "NSE:KPIGREEN-EQ",
    "NSE:CARTRADE-EQ",
    "NSE:TTML-EQ",
    "NSE:BANCOINDIA-EQ",
    "NSE:STARCEMENT-EQ",
    "NSE:TSFINV-EQ",
    "NSE:PNGJL-EQ",
    "NSE:VIYASH-EQ",
    "NSE:LEMONTREE-EQ",
    "NSE:PVRINOX-EQ",
    "NSE:STAR-EQ",
    "NSE:GRWRHITECH-EQ",
    "NSE:ELECON-EQ",
    "NSE:EUREKAFORB-EQ",
    "NSE:PCJEWELLER-EQ",
    "NSE:KTKBANK-EQ",
    "NSE:QPOWER-EQ",
    "NSE:JAYNECOIND-EQ",
    "NSE:PARKHOSPS-EQ",
    "NSE:LLOYDSENT-EQ",
    "NSE:BBOX-EQ",
    "NSE:CELLO-EQ",
    "NSE:TIMETECHNO-EQ",
    "NSE:TARIL-EQ",
    "NSE:INTELLECT-EQ",
    "NSE:RKFORGE-EQ",
    "NSE:BATAINDIA-EQ",
    "NSE:IIFLCAPS-EQ",
    "NSE:METROPOLIS-EQ",
    "NSE:BALRAMCHIN-EQ",
    "NSE:CORONA-EQ",
    "NSE:TITAGARH-EQ",
    "NSE:SHARDACROP-EQ",
    "NSE:OLECTRA-EQ",
    "NSE:NAZARA-EQ",
    "NSE:APOLLO-EQ",
    "NSE:NCC-EQ",
    "NSE:SOUTHBANK-EQ",
    "NSE:ARVIND-EQ",
    "NSE:MMTC-EQ",
    "NSE:VOLTAMP-EQ",
    "NSE:ASTRAMICRO-EQ",
    "NSE:MEDPLUS-EQ",
    "NSE:VIJAYA-EQ",
    "NSE:ATLANTAELE-EQ",
    "NSE:JUBLINGREA-EQ",
    "NSE:SANDUMA-EQ",
    "NSE:BBTC-EQ",
    "NSE:RITES-EQ",
    "NSE:CYIENT-EQ",
    "NSE:AAVAS-EQ",
    "NSE:SBFC-EQ",
    "NSE:RAILTEL-EQ",
    "NSE:MANYAVAR-EQ",
    "NSE:TMB-EQ",
    "NSE:FINPIPE-EQ",
    "NSE:BSOFT-EQ",
    "NSE:ACE-EQ",
    "NSE:SWANCORP-EQ",
    "NSE:NUVOCO-EQ",
    "NSE:CEMPRO-EQ",
    "NSE:MGL-EQ",
    "NSE:PCBL-EQ",
    "NSE:HONASA-EQ",
    "NSE:SIGNATURE-EQ",
    "NSE:EDELWEISS-EQ",
    "NSE:WHIRLPOOL-EQ",
    "NSE:BLACKBUCK-EQ",
    "NSE:CONCORDBIO-EQ",
    "NSE:PRUDENT-EQ",
    "NSE:UJJIVANSFB-EQ",
    "NSE:AEQUS-EQ",
    "NSE:CANFINHOME-EQ",
    "NSE:TI-EQ",
    "NSE:WAAREERTL-EQ",
    "NSE:SKFINDUS-EQ",
    "NSE:INDGN-EQ",
    "NSE:HOMEFIRST-EQ",
    "NSE:GODREJAGRO-EQ",
    "NSE:RPOWER-EQ",
    "NSE:WELSPUNLIV-EQ",
    "NSE:GRAVITA-EQ",
    "NSE:IEX-EQ",
    "NSE:HEG-EQ",
    "NSE:JWL-EQ",
    "NSE:LUMAXTECH-EQ",
    "NSE:BLS-EQ",
    "NSE:PRIVISCL-EQ",
    "NSE:AFCONS-EQ",
    "NSE:AZAD-EQ",
    "NSE:APTUS-EQ",
    "NSE:JKTYRE-EQ",
    "NSE:NSLNISP-EQ",
    "NSE:RAINBOW-EQ",
    "NSE:BLUEDART-EQ",
    "NSE:MINDACORP-EQ",
    "NSE:STLTECH-EQ",
    "NSE:ABLBL-EQ",
    "NSE:INDIACEM-EQ",
    "NSE:PARADEEP-EQ",
    "NSE:INDIAMART-EQ",
    "NSE:TEGA-EQ",
    "NSE:THANGAMAYL-EQ",
    "NSE:ALIVUS-EQ",
    "NSE:JPPOWER-EQ",
    "NSE:JMFINANCIL-EQ",
    "NSE:FIRSTCRY-EQ",
    "NSE:GRAPHITE-EQ",
    "NSE:DEVYANI-EQ",
    "NSE:UTIAMC-EQ",
    "NSE:TRIDENT-EQ",
    "NSE:CAPLIPOINT-EQ",
    "NSE:INOXINDIA-EQ",
    "NSE:ENGINERSIN-EQ",
    "NSE:USHAMART-EQ",
    "NSE:ZENSARTECH-EQ",
    "NSE:CUPID-EQ",
    "NSE:FIVESTAR-EQ",
    "NSE:KIRLOSBROS-EQ",
    "NSE:AGARWALEYE-EQ",
    "NSE:TBOTEK-EQ",
    "NSE:CANHLIFE-EQ",
    "NSE:SCI-EQ",
    "NSE:ARE&M-EQ",
    "NSE:SOBHA-EQ",
    "NSE:THELEELA-EQ",
    "NSE:TECHNOE-EQ",
    "NSE:VGUARD-EQ",
    "NSE:FINCABLES-EQ",
    "NSE:J&KBANK-EQ",
    "NSE:DOMS-EQ",
    "NSE:JUBLPHARMA-EQ",
    "NSE:CCL-EQ",
    "NSE:IRCON-EQ",
    "NSE:SPLPETRO-EQ",
    "NSE:JAINREC-EQ",
    "NSE:GABRIEL-EQ",
    "NSE:ZENTEC-EQ",
    "NSE:HFCL-EQ",
    "NSE:ANURAS-EQ",
    "NSE:LTFOODS-EQ",
    "NSE:BEML-EQ",
    "NSE:JBMA-EQ",
    "NSE:NIVABUPA-EQ",
    "NSE:RUBICON-EQ",
    "NSE:SANSERA-EQ",
    "NSE:POLYMED-EQ",
    "NSE:COHANCE-EQ",
    "NSE:MTARTECH-EQ",
    "NSE:MAHSCOOTER-EQ",
    "NSE:CEATLTD-EQ",
    "NSE:JINDALSAW-EQ",
    "NSE:GSPL-EQ",
    "NSE:ECLERX-EQ",
    "NSE:EIDPARRY-EQ",
    "NSE:APLLTD-EQ",
    "NSE:KEC-EQ",
    "NSE:CHENNPETRO-EQ",
    "NSE:DEEPAKFERT-EQ",
    "NSE:TDPOWERSYS-EQ",
    "NSE:AETHER-EQ",
    "NSE:ZYDUSWELL-EQ",
    "NSE:ABREL-EQ",
    "NSE:AARTIIND-EQ",
    "NSE:PGEL-EQ",
    "NSE:ABDL-EQ",
    "NSE:JYOTICNC-EQ",
    "NSE:IGIL-EQ",
    "NSE:CHOICEIN-EQ",
    "NSE:VTL-EQ",
    "NSE:GRANULES-EQ",
    "NSE:KANSAINER-EQ",
    "NSE:TRITURBINE-EQ",
    "NSE:SHRIPISTON-EQ",
    "NSE:IFCI-EQ",
    "NSE:BIKAJI-EQ",
    "NSE:RRKABEL-EQ",
    "NSE:CROMPTON-EQ",
    "NSE:KSB-EQ",
    "NSE:KFINTECH-EQ",
    "NSE:INOXWIND-EQ",
    "NSE:FSL-EQ",
    "NSE:CENTURYPLY-EQ",
    "NSE:CHALET-EQ",
    "NSE:JSWCEMENT-EQ",
    "NSE:TRAVELFOOD-EQ",
    "NSE:ELGIEQUIP-EQ",
    "NSE:CGCL-EQ",
    "NSE:SYNGENE-EQ",
    "NSE:ONESOURCE-EQ",
    "NSE:SAMMAANCAP-EQ",
    "NSE:CARBORUNIV-EQ",
    "NSE:OLAELEC-EQ",
    "NSE:CASTROLIND-EQ",
    "NSE:TATACHEM-EQ",
    "NSE:CHAMBLFERT-EQ",
    "NSE:REDINGTON-EQ",
    "NSE:CRAFTSMAN-EQ",
    "NSE:EMMVEE-EQ",
    "NSE:ACMESOLAR-EQ",
    "NSE:ANANTRAJ-EQ",
    "NSE:CAMS-EQ",
    "NSE:CIEINDIA-EQ",
    "NSE:BRIGADE-EQ",
    "NSE:KAJARIACER-EQ",
    "NSE:SYRMA-EQ",
    "NSE:BELRISE-EQ",
    "NSE:DCMSHRIRAM-EQ",
    "NSE:CUB-EQ",
    "NSE:ACUTAAS-EQ",
    "NSE:ATUL-EQ",
    "NSE:RBLBANK-EQ",
    "NSE:DATAPATTNS-EQ",
    "NSE:NEULANDLAB-EQ",
    "NSE:EMAMILTD-EQ",
    "NSE:PPLPHARMA-EQ",
    "NSE:NAVA-EQ",
    "NSE:ERIS-EQ",
    "NSE:NATCOPHARM-EQ",
    "NSE:AVANTIFEED-EQ",
    "NSE:SAGILITY-EQ",
    "NSE:EIHOTEL-EQ",
    "NSE:IIFL-EQ",
    "NSE:CREDITACC-EQ",
    "NSE:GESHIP-EQ",
    "NSE:GALLANTT-EQ",
    "NSE:GPIL-EQ",
    "NSE:KPITTECH-EQ",
    "NSE:SAILIFE-EQ",
    "NSE:URBANCO-EQ",
    "NSE:AFFLE-EQ",
    "NSE:DEEPAKNTR-EQ",
    "NSE:SARDAEN-EQ",
    "NSE:KPIL-EQ",
    "NSE:AADHARHFC-EQ",
    "NSE:NETWEB-EQ",
    "NSE:ASAHIINDIA-EQ",
    "NSE:HBLENGINE-EQ",
    "NSE:BAYERCROP-EQ",
    "NSE:SUMICHEM-EQ",
    "NSE:AEGISVOPAK-EQ",
    "NSE:PINELABS-EQ",
    "NSE:PFIZER-EQ",
    "NSE:WOCKPHARMA-EQ",
    "NSE:CESC-EQ",
    "NSE:MANAPPURAM-EQ",
    "NSE:GMDCLTD-EQ",
    "NSE:LALPATHLAB-EQ",
    "NSE:KIRLOSENG-EQ",
    "NSE:PTCIL-EQ",
    "NSE:IGL-EQ",
    "NSE:TENNIND-EQ",
    "NSE:RAMCOCEM-EQ",
    "NSE:TATATECH-EQ",
    "NSE:AWL-EQ",
    "NSE:PNBHOUSING-EQ",
    "NSE:SHYAMMETL-EQ",
    "NSE:SCHNEIDER-EQ",
    "NSE:AEGISLOG-EQ",
    "NSE:HSCL-EQ",
    "NSE:SUNTV-EQ",
    "NSE:NBCC-EQ",
    "NSE:NUVAMA-EQ",
    "NSE:IKS-EQ",
    "NSE:GILLETTE-EQ",
    "NSE:MSUMI-EQ",
    "NSE:TIMKEN-EQ",
    "NSE:CPPLUS-EQ",
    "NSE:PFOCUS-EQ",
    "NSE:KARURVYSYA-EQ",
    "NSE:IRB-EQ",
    "NSE:ACC-EQ",
    "NSE:KIMS-EQ",
    "NSE:ZFCVINDIA-EQ",
    "NSE:NIACL-EQ",
    "NSE:AMBER-EQ",
    "NSE:EXIDEIND-EQ",
    "NSE:BANDHANBNK-EQ",
    "NSE:KAYNES-EQ",
    "NSE:APOLLOTYRE-EQ",
    "NSE:WELCORP-EQ",
    "NSE:TATAELXSI-EQ",
    "NSE:ITI-EQ",
    "NSE:HONAUT-EQ",
    "NSE:CDSL-EQ",
    "NSE:MEDANTA-EQ",
    "NSE:ANGELONE-EQ",
    "NSE:FORCEMOT-EQ",
    "NSE:GODIGIT-EQ",
    "NSE:GLAND-EQ",
    "NSE:STARHEALTH-EQ",
    "NSE:LICHSGFIN-EQ",
    "NSE:HEXT-EQ",
    "NSE:JUBLFOOD-EQ",
    "NSE:ANANDRATHI-EQ",
    "NSE:CHOLAHLDNG-EQ",
    "NSE:SJVN-EQ",
    "NSE:ABSLAMC-EQ",
    "NSE:PWL-EQ",
    "NSE:GRSE-EQ",
    "NSE:GODREJIND-EQ",
    "NSE:KPRMILL-EQ",
    "NSE:EMCURE-EQ",
    "NSE:CRISIL-EQ",
    "NSE:JBCHEPHARM-EQ",
    "NSE:MRPL-EQ",
    "NSE:NAVINFLUOR-EQ",
    "NSE:ATHERENERG-EQ",
    "NSE:CENTRALBK-EQ",
    "NSE:ENDURANCE-EQ",
    "NSE:UCOBANK-EQ",
    "NSE:ITCHOTELS-EQ",
    "NSE:GODFRYPHLP-EQ",
    "NSE:DELHIVERY-EQ",
    "NSE:AJANTPHARM-EQ",
    "NSE:3MINDIA-EQ",
    "NSE:ASTERDM-EQ",
    "NSE:TATAINVEST-EQ",
    "NSE:POONAWALLA-EQ",
    "NSE:ESCORTS-EQ",
    "NSE:FLUOROCHEM-EQ",
    "NSE:SONACOMS-EQ",
    "NSE:AIAENG-EQ",
    "NSE:LTTS-EQ",
    "NSE:DALBHARAT-EQ",
    "NSE:IPCALAB-EQ",
    "NSE:IREDA-EQ",
    "NSE:NH-EQ",
    "NSE:PIRAMALFIN-EQ",
    "NSE:CONCOR-EQ",
    "NSE:BLUESTARCO-EQ",
    "NSE:AIIL-EQ",
    "NSE:HUDCO-EQ",
    "NSE:UBL-EQ",
    "NSE:ANTHEM-EQ",
    "NSE:PETRONET-EQ",
    "NSE:COCHINSHIP-EQ",
    "NSE:GLAXO-EQ",
    "NSE:NLCINDIA-EQ",
    "NSE:M&MFIN-EQ",
    "NSE:PAGEIND-EQ",
    "NSE:RADICO-EQ",
    "NSE:JKCEMENT-EQ",
    "NSE:ASTRAL-EQ",
    "NSE:TATACOMM-EQ",
    "NSE:KALYANKJIL-EQ",
    "NSE:COFORGE-EQ",
    "NSE:BALKRISIND-EQ",
    "NSE:360ONE-EQ",
    "NSE:IRCTC-EQ",
    "NSE:APARINDS-EQ",
    "NSE:KEI-EQ",
    "NSE:PREMIERENE-EQ",
    "NSE:MPHASIS-EQ",
    "NSE:SUPREMEIND-EQ",
    "NSE:PIIND-EQ",
    "NSE:VOLTAS-EQ",
    "NSE:MOTILALOFS-EQ",
    "NSE:THERMAX-EQ",
    "NSE:BDL-EQ",
    "NSE:PATANJALI-EQ",
    "NSE:GODREJPROP-EQ",
    "NSE:TIINDIA-EQ",
    "NSE:BERGEPAINT-EQ",
    "NSE:ABBOTINDIA-EQ",
    "NSE:HINDCOPPER-EQ",
    "NSE:VMM-EQ",
    "NSE:SUNDARMFIN-EQ",
    "NSE:MAHABANK-EQ",
    "NSE:UPL-EQ",
    "NSE:HDBFS-EQ",
    "NSE:COLPAL-EQ",
    "NSE:JSWINFRA-EQ",
    "NSE:BIOCON-EQ",
    "NSE:MFSL-EQ",
    "NSE:FACT-EQ",
    "NSE:PRESTIGE-EQ",
    "NSE:APLAPOLLO-EQ",
    "NSE:IDFCFIRSTB-EQ",
    "NSE:MRF-EQ",
    "NSE:COROMANDEL-EQ",
    "NSE:LAURUSLABS-EQ",
    "NSE:LINDEINDIA-EQ",
    "NSE:OBEROIRLTY-EQ",
    "NSE:SCHAEFFLER-EQ",
    "NSE:RVNL-EQ",
    "NSE:YESBANK-EQ",
    "NSE:UNOMINDA-EQ",
    "NSE:GLENMARK-EQ",
    "NSE:PHOENIXLTD-EQ",
    "NSE:NAM-INDIA-EQ",
    "NSE:JSL-EQ",
    "NSE:SBICARD-EQ",
    "NSE:INDUSINDBK-EQ",
    "NSE:ALKEM-EQ",
    "NSE:FORTIS-EQ",
    "NSE:IOB-EQ",
    "NSE:BANKINDIA-EQ",
    "NSE:NAUKRI-EQ",
    "NSE:DIXON-EQ",
    "NSE:OFSS-EQ",
    "NSE:ATGL-EQ",
    "NSE:GICRE-EQ",
    "NSE:SAIL-EQ",
    "NSE:LTF-EQ",
    "NSE:SUZLON-EQ",
    "NSE:FEDERALBNK-EQ",
    "NSE:MCX-EQ",
    "NSE:POLICYBZR-EQ",
    "NSE:SRF-EQ",
    "NSE:AUBANK-EQ",
    "NSE:PAYTM-EQ",
    "NSE:MEESHO-EQ",
    "NSE:OIL-EQ",
    "NSE:BAJAJHFL-EQ",
    "NSE:SWIGGY-EQ",
    "NSE:BHARTIHEXA-EQ",
    "NSE:NYKAA-EQ",
    "NSE:DABUR-EQ",
    "NSE:TORNTPOWER-EQ",
    "NSE:NMDC-EQ",
    "NSE:HINDPETRO-EQ",
    "NSE:AUROPHARMA-EQ",
    "NSE:NATIONALUM-EQ",
    "NSE:IDBI-EQ",
    "NSE:ICICIPRULI-EQ",
    "NSE:HAVELLS-EQ",
    "NSE:NHPC-EQ",
    "NSE:PERSISTENT-EQ",
    "NSE:LODHA-EQ",
    "NSE:MANKIND-EQ",
    "NSE:BHARATFORG-EQ",
    "NSE:ABCAPITAL-EQ",
    "NSE:SHREECEM-EQ",
    "NSE:LLOYDSME-EQ",
    "NSE:LENSKART-EQ",
    "NSE:INDHOTEL-EQ",
    "NSE:ICICIGI-EQ",
    "NSE:NTPCGREEN-EQ",
    "NSE:JSWENERGY-EQ",
    "NSE:UNITDSPR-EQ",
    "NSE:ZYDUSLIFE-EQ",
    "NSE:MAXHEALTH-EQ",
    "NSE:MARICO-EQ",
    "NSE:RECLTD-EQ",
    "NSE:WAAREEENER-EQ",
    "NSE:CIPLA-EQ",
    "NSE:GMRAIRPORT-EQ",
    "NSE:ASHOKLEY-EQ",
    "NSE:DRREDDY-EQ",
    "NSE:GAIL-EQ",
    "NSE:IDEA-EQ",
    "NSE:HEROMOTOCO-EQ",
    "NSE:MAZDOCK-EQ",
    "NSE:GVT&D-EQ",
    "NSE:LUPIN-EQ",
    "NSE:LGEINDIA-EQ",
    "NSE:ENRIN-EQ",
    "NSE:INDUSTOWER-EQ",
    "NSE:TATACONSUM-EQ",
    "NSE:BHEL-EQ",
    "NSE:APOLLOHOSP-EQ",
    "NSE:BOSCHLTD-EQ",
    "NSE:GODREJCP-EQ",
    "NSE:AMBUJACEM-EQ",
    "NSE:BAJAJHLDNG-EQ",
    "NSE:HDFCAMC-EQ",
    "NSE:CGPOWER-EQ",
    "NSE:POLYCAB-EQ",
    "NSE:GROWW-EQ",
    "NSE:INDIANB-EQ",
    "NSE:POWERINDIA-EQ",
    "NSE:CANBK-EQ",
    "NSE:JINDALSTEL-EQ",
    "NSE:PNB-EQ",
    "NSE:SIEMENS-EQ",
    "NSE:MOTHERSON-EQ",
    "NSE:TMPV-EQ",
    "NSE:HDFCLIFE-EQ",
    "NSE:CHOLAFIN-EQ",
    "NSE:BPCL-EQ",
    "NSE:TATAPOWER-EQ",
    "NSE:SOLARINDS-EQ",
    "NSE:IRFC-EQ",
    "NSE:BRITANNIA-EQ",
    "NSE:LTM-EQ",
    "NSE:TORNTPHARM-EQ",
    "NSE:PIDILITIND-EQ",
    "NSE:CUMMINSIND-EQ",
    "NSE:MUTHOOTFIN-EQ",
    "NSE:TATACAP-EQ",
    "NSE:BSE-EQ",
    "NSE:UNIONBANK-EQ",
    "NSE:BANKBARODA-EQ",
    "NSE:TRENT-EQ",
    "NSE:TECHM-EQ",
    "NSE:ABB-EQ",
    "NSE:DLF-EQ",
    "NSE:ADANIENSOL-EQ",
    "NSE:PFC-EQ",
    "NSE:HYUNDAI-EQ",
    "NSE:JIOFIN-EQ",
    "NSE:VBL-EQ",
    "NSE:TMCV-EQ",
    "NSE:ICICIAMC-EQ",
    "NSE:DIVISLAB-EQ",
    "NSE:TVSMOTOR-EQ",
    "NSE:INDIGO-EQ",
    "NSE:GRASIM-EQ",
    "NSE:ADANIGREEN-EQ",
    "NSE:EICHERMOT-EQ",
    "NSE:SBILIFE-EQ",
    "NSE:IOC-EQ",
    "NSE:WIPRO-EQ",
    "NSE:HINDALCO-EQ",
    "NSE:ASIANPAINT-EQ",
    "NSE:ETERNAL-EQ",
    "NSE:SHRIRAMFIN-EQ",
    "NSE:NESTLEIND-EQ",
    "NSE:HINDZINC-EQ",
    "NSE:TATASTEEL-EQ",
    "NSE:COALINDIA-EQ",
    "NSE:BAJAJ-AUTO-EQ",
    "NSE:ADANIENT-EQ",
    "NSE:HAL-EQ",
    "NSE:BAJAJFINSV-EQ",
    "NSE:POWERGRID-EQ",
    "NSE:DMART-EQ",
    "NSE:JSWSTEEL-EQ",
    "NSE:VEDL-EQ",
    "NSE:BEL-EQ",
    "NSE:ULTRACEMCO-EQ",
    "NSE:ONGC-EQ",
    "NSE:ADANIPORTS-EQ",
    "NSE:KOTAKBANK-EQ",
    "NSE:NTPC-EQ",
    "NSE:ADANIPOWER-EQ",
    "NSE:ITC-EQ",
    "NSE:HCLTECH-EQ",
    "NSE:M&M-EQ",
    "NSE:TITAN-EQ",
    "NSE:SUNPHARMA-EQ",
    "NSE:AXISBANK-EQ",
    "NSE:MARUTI-EQ",
    "NSE:HINDUNILVR-EQ",
    "NSE:LICI-EQ",
    "NSE:INFY-EQ",
    "NSE:LT-EQ",
    "NSE:BAJFINANCE-EQ",
    "NSE:TCS-EQ",
    "NSE:ICICIBANK-EQ",
    "NSE:SBIN-EQ",
    "NSE:BHARTIARTL-EQ",
    "NSE:HDFCBANK-EQ",
    "NSE:RELIANCE-EQ",
]


# ─────────────────────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler("auto_update.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
#  TOKEN STORAGE  (saves both access + refresh token)
# ─────────────────────────────────────────────────────────────
def save_tokens(access_token, refresh_token, saved_date):
    data = {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "saved_date":    saved_date,
    }
    with open(TOKEN_FILE, "w") as f:
        json.dump(data, f, indent=2)
    log.info("Tokens saved to %s", TOKEN_FILE)


def load_tokens():
    if not os.path.exists(TOKEN_FILE):
        return None, None, None
    with open(TOKEN_FILE, "r") as f:
        data = json.load(f)
    return (
        data.get("access_token"),
        data.get("refresh_token"),
        data.get("saved_date"),
    )


# ─────────────────────────────────────────────────────────────
#  FULL LOGIN  (browser – only needed once every 15 days)
# ─────────────────────────────────────────────────────────────
def full_login():
    log.info("Full login required (refresh token expired or not found)")
    session = SessionModel(
        client_id=APP_ID, secret_key=SECRET_KEY,
        redirect_uri=REDIRECT_URI, response_type=RESPONSE_TYPE,
        grant_type=GRANT_TYPE,
    )
    auth_url = session.generate_authcode()

    print("\n" + "=" * 65)
    print("  LOGIN REQUIRED (once every 15 days)")
    print("  Open this URL in browser and log in:")
    print(f"\n  {auth_url}\n")
    print("  After login, copy the FULL redirect URL and paste below.")
    print("=" * 65 + "\n")

    redirect_url = input("Paste redirect URL: ").strip()
    parsed    = urlparse.urlparse(redirect_url)
    params    = urlparse.parse_qs(parsed.query)
    auth_code = (params.get("auth_code") or params.get("code") or [None])[0]

    if not auth_code:
        raise ValueError("Could not extract auth_code from URL.")

    session2 = SessionModel(
        client_id=APP_ID, secret_key=SECRET_KEY,
        redirect_uri=REDIRECT_URI, response_type=RESPONSE_TYPE,
        grant_type=GRANT_TYPE,
    )
    session2.set_token(auth_code)
    response = session2.generate_token()
    log.info("Login response keys: %s", list(response.keys()))

    access_token  = response.get("access_token")
    refresh_token = response.get("refresh_token")

    if not access_token:
        raise RuntimeError(f"access_token not found: {response}")
    if not refresh_token:
        raise RuntimeError(f"refresh_token not found: {response}")

    today = datetime.today().strftime("%Y-%m-%d")
    save_tokens(access_token, refresh_token, today)
    log.info("Full login successful. Next login needed in 15 days.")
    return access_token, refresh_token


# ─────────────────────────────────────────────────────────────
#  REFRESH TOKEN  (auto – no browser needed)
# ─────────────────────────────────────────────────────────────
def refresh_access_token(refresh_token):
    """
    Use refresh_token to get a new access_token silently.
    No browser login needed.
    """
    log.info("Refreshing access token silently...")
    try:
        session = SessionModel(
            client_id=APP_ID,
            secret_key=SECRET_KEY,
            redirect_uri=REDIRECT_URI,
            response_type=RESPONSE_TYPE,
            grant_type="refresh_token",     # key difference
        )
        session.set_token(refresh_token)
        response = session.generate_token()
        log.info("Refresh response keys: %s", list(response.keys()))

        new_access_token = (
            response.get("access_token")
            or response.get("data", {}).get("access_token")
        )

        if not new_access_token or response.get("s") == "error":
            log.warning("Refresh failed: %s", response)
            return None

        log.info("Access token refreshed successfully.")
        return new_access_token

    except Exception as e:
        log.warning("Exception during token refresh: %s", e)
        return None


# ─────────────────────────────────────────────────────────────
#  GET VALID ACCESS TOKEN
# ─────────────────────────────────────────────────────────────
def get_valid_token():
    """
    Smart token manager:
    1. Load saved tokens
    2. If access token is from today → reuse it
    3. If refresh token is available → silently refresh
    4. If refresh token expired (>15 days) → full browser login
    """
    access_token, refresh_token, saved_date = load_tokens()
    today = datetime.today().strftime("%Y-%m-%d")

    # Case 1: Access token is fresh from today
    if access_token and saved_date == today:
        log.info("Access token is fresh from today. Reusing.")
        return access_token

    # Case 2: Refresh token available → try silent refresh
    if refresh_token:
        # Check if refresh token is within 15 days
        if saved_date:
            days_old = (datetime.today() - datetime.strptime(saved_date, "%Y-%m-%d")).days
            if days_old >= 14:
                log.warning("Refresh token is %d days old (expires at 15). Full login needed.", days_old)
                access_token, refresh_token = full_login()
                return access_token

        new_access_token = refresh_access_token(refresh_token)
        if new_access_token:
            # Save new access token keeping the same refresh token
            save_tokens(new_access_token, refresh_token, today)
            return new_access_token
        else:
            log.warning("Silent refresh failed. Falling back to full login.")

    # Case 3: No refresh token or refresh failed → full browser login
    access_token, refresh_token = full_login()
    return access_token


# ─────────────────────────────────────────────────────────────
#  FYERS CLIENT
# ─────────────────────────────────────────────────────────────
def get_fyers_client(token):
    return fyersModel.FyersModel(client_id=APP_ID, token=token, log_path="")


# ─────────────────────────────────────────────────────────────
#  GET LAST SAVED DATE FOR A SYMBOL
# ─────────────────────────────────────────────────────────────
def get_last_date(symbol):
    safe = symbol.replace(":", "_").replace("-", "_")
    path = os.path.join(SYM_DIR, f"{safe}.csv")
    if not os.path.exists(path):
        return None
    try:
        df = pd.read_csv(path)
        if df.empty or "date" not in df.columns:
            return None
        return df["date"].max()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  FETCH NEW CANDLES
# ─────────────────────────────────────────────────────────────
def fetch_new_candles(fyers, symbol, from_date, to_date):
    payload = {
        "symbol":      symbol,
        "resolution":  RESOLUTION,
        "date_format": "1",
        "range_from":  from_date,
        "range_to":    to_date,
        "cont_flag":   "1",
    }
    try:
        resp = fyers.history(data=payload)
    except Exception as exc:
        log.warning("Exception [%s]: %s", symbol, exc)
        return None

    status = resp.get("s", "")
    code   = resp.get("code")

    if status == "ok" or code == 200:
        candles = resp.get("candles") or []
        if not candles:
            return pd.DataFrame()
        df = pd.DataFrame(
            candles,
            columns=["timestamp", "open", "high", "low", "close", "volume"]
        )
        df["date"] = pd.to_datetime(df["timestamp"], unit="s").dt.strftime("%Y-%m-%d")
        return df[["date", "open", "high", "low", "close", "volume"]]

    if code == 401:
        log.error("Token expired (401). Clearing tokens.")
        if os.path.exists(TOKEN_FILE):
            os.remove(TOKEN_FILE)
        raise SystemExit("Token expired. Re-run: python auto_update.py")

    if code == -300:
        return pd.DataFrame()

    log.warning("API error [%s]: s=%s code=%s msg=%s",
                symbol, status, code, resp.get("message", ""))
    return None


# ─────────────────────────────────────────────────────────────
#  APPEND TO CSV  (now stamps shares on every new row)
# ─────────────────────────────────────────────────────────────
def append_to_csv(symbol: str, new_df: pd.DataFrame, shares: int | None) -> int:
    """
    Merge new_df into the existing per-symbol CSV.
    - Adds a `shares` column from TICKER_fyers.csv (static per symbol).
    - Adds a `market_cap` column = close * shares  (in INR).
    - market_cap_cr = market_cap / 1e7  (in crore rupees) is also stored.

    Returns total row count after save.
    """
    safe = symbol.replace(":", "_").replace("-", "_")
    path = os.path.join(SYM_DIR, f"{safe}.csv")

    # Stamp shares onto new rows
    new_df = new_df.copy()
    if shares is not None:
        new_df["shares"]       = shares
        new_df["market_cap"]   = (new_df["close"] * shares).round(2)          # INR
        new_df["market_cap_cr"] = (new_df["market_cap"] / 1e7).round(4)       # Crore
    else:
        new_df["shares"]        = None
        new_df["market_cap"]    = None
        new_df["market_cap_cr"] = None

    if os.path.exists(path):
        existing = pd.read_csv(path)
        # Back-fill shares on existing rows that are missing it
        if shares is not None:
            if "shares" not in existing.columns or existing["shares"].isna().any():
                existing["shares"]        = shares
                existing["market_cap"]    = (existing["close"] * shares).round(2)
                existing["market_cap_cr"] = (existing["market_cap"] / 1e7).round(4)
        combined = pd.concat([existing, new_df], ignore_index=True)
    else:
        combined = new_df

    combined = (combined
                .drop_duplicates(subset=["date"])
                .sort_values("date")
                .reset_index(drop=True))

    os.makedirs(SYM_DIR, exist_ok=True)
    combined.to_csv(path, index=False)
    return len(combined)


# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────
def main():
    today    = datetime.today().strftime("%Y-%m-%d")
    updated  = 0
    skipped  = 0
    failed   = []
    new_rows = 0

    log.info("=" * 55)
    log.info("  Auto OHLCV Update")
    log.info("  Date    : %s", today)
    log.info("  Symbols : %d", len(SYMBOLS))
    log.info("=" * 55)

    # Load share counts once at startup
    shares_map = load_shares_map(TICKER_FILE)

    # Get valid token (auto-refresh, no browser unless expired)
    token = get_valid_token()
    fyers = get_fyers_client(token)

    for idx, symbol in enumerate(SYMBOLS, start=1):
        last_date = get_last_date(symbol)
        shares    = shares_map.get(symbol)          # None if not in ticker file

        # Already up to date
        if last_date == today:
            log.info("[%d/%d]  %s  already up to date", idx, len(SYMBOLS), symbol)
            skipped += 1
            continue

        # Fetch from day after last saved date
        if last_date:
            from_date = (datetime.strptime(last_date, "%Y-%m-%d")
                         + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            from_date = (datetime.today() - timedelta(days=730)).strftime("%Y-%m-%d")

        log.info("[%d/%d]  %s  from %s -> %s",
                 idx, len(SYMBOLS), symbol, from_date, today)

        new_df = fetch_new_candles(fyers, symbol, from_date, today)
        time.sleep(REQUEST_DELAY)

        if new_df is None:
            log.warning("  FAILED: %s", symbol)
            failed.append(symbol)
            continue

        if new_df.empty:
            log.info("  No new candles (holiday or market closed)")
            skipped += 1
            continue

        total_rows = append_to_csv(symbol, new_df, shares)
        new_rows  += len(new_df)
        updated   += 1
        log.info("  +%d new rows  |  total %d rows saved  |  shares=%s",
                 len(new_df), total_rows,
                 f"{shares:,}" if shares else "N/A")

    # Summary
    log.info("=" * 55)
    log.info("  Update complete!")
    log.info("  Updated  : %d symbols (+%d new rows)", updated, new_rows)
    log.info("  Skipped  : %d symbols (up to date / holiday)", skipped)
    log.info("  Failed   : %d symbols", len(failed))
    if failed:
        log.warning("  Failed list: %s", failed)
    log.info("=" * 55)


if __name__ == "__main__":
    main()
