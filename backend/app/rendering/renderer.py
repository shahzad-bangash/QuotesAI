import os
import json
import base64
import uuid
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
from PIL import Image

from .text_layout import TextLayoutEngine

BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = os.getenv("DATA_DIR", str(BASE_DIR))
GENERATED_DIR = Path(DATA_DIR) / "generated"

def render_quote_image(quote_text: str, author: str = "", source: str = "", style_name: str = "mental_notes", format: str = "jpeg", user_profile: dict = None) -> dict:
    # 1. Load Profile
    if user_profile:
        profile = {
            "name": user_profile.get("name") or "Name",
            "username": user_profile.get("username") or "@username",
        }
        if user_profile.get("profile_pic_url"):
            parts = user_profile["profile_pic_url"].split("/images/")
            if len(parts) > 1:
                pfp_path = GENERATED_DIR / parts[1]
            else:
                pfp_path = BASE_DIR / "assets" / "profile" / "pfp.jpg"
        else:
            pfp_path = BASE_DIR / "assets" / "profile" / "pfp.jpg"
    else:
        profile_path = BASE_DIR / "assets" / "profile" / "profile.json"
        if profile_path.exists():
            with open(profile_path, 'r') as f:
                profile = json.load(f)
        else:
            profile = {}
            
        if "name" not in profile or not profile["name"]:
            profile["name"] = "Name"
        if "username" not in profile or not profile["username"]:
            profile["username"] = "@username"
            
        pfp_path = BASE_DIR / profile.get("profile_image", "assets/profile/pfp.jpg")

    if not pfp_path.exists():
        pfp_path = BASE_DIR / "assets" / "profile" / "pfp.jpg"


    # 2. Load Style
    # Ensure style_name is safe
    safe_style_name = os.path.basename(style_name)
    style_path = BASE_DIR / "styles" / f"{safe_style_name}.json"
    if not style_path.exists():
        style_path = BASE_DIR / "styles" / "mental_notes.json"
        
    with open(style_path, 'r') as f:
        style = json.load(f)

    # 3. Calculate Layout Determinstically
    engine = TextLayoutEngine(style)
    layout = engine.layout(quote_text)

    # 4. Read profile image and convert to base64
    profile_img_b64 = ""
    if pfp_path.exists():
        with open(pfp_path, "rb") as image_file:
            profile_img_b64 = base64.b64encode(image_file.read()).decode('utf-8')

    # 4.5. Read font file and convert to base64
    font_file = style.get("text", {}).get("font_file", "Inter-Bold.ttf")
    font_path = BASE_DIR / "assets" / "fonts" / font_file
    font_b64 = ""
    if font_path.exists():
        with open(font_path, "rb") as f:
            font_b64 = base64.b64encode(f.read()).decode('utf-8')

    # 5. Render Template
    env = Environment(loader=FileSystemLoader(str(BASE_DIR / "app" / "rendering")))
    template = env.get_template("template.jinja")
    
    # We pass the pre-calculated layout to the template instead of the raw quote
    html_content = template.render(
        layout=layout,
        author=author,
        source=source,
        profile=profile,
        style=style,
        profile_img_b64=profile_img_b64,
        font_b64=font_b64
    )

    gen_id = str(uuid.uuid4())
    temp_html_path = GENERATED_DIR / f"{gen_id}.html"
    
    # Ensure generated directory exists
    os.makedirs(GENERATED_DIR, exist_ok=True)
    
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    format = format.lower()
    if format not in ["jpeg", "png"]:
        format = "jpeg"

    import re
    def slugify(text: str, max_length: int = 30) -> str:
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s-]', '', text)
        text = re.sub(r'[\s-]+', '-', text).strip('-')
        return text[:max_length].strip('-')
        
    author_slug = slugify(author) if author and author.lower() != "unknown" else "quote"
    quote_slug = slugify(quote_text)
    
    base_name = f"{author_slug}-{quote_slug}"[:40].strip('-')
    if not base_name:
        base_name = "quote"
        
    final_filename = f"{base_name}-{gen_id[:8]}.{format}"

    out_path = GENERATED_DIR / format / final_filename
    
    # Ensure format directory exists
    os.makedirs(GENERATED_DIR / format, exist_ok=True)

    # 6. Capture with Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': style["canvas"]["width"], 'height': style["canvas"]["height"]})
        page.goto(temp_html_path.absolute().as_uri(), wait_until="domcontentloaded")
        
        if format == "jpeg":
            page.screenshot(path=str(out_path), type="jpeg", quality=95)
        else:
            page.screenshot(path=str(out_path), type="png")
            
        browser.close()

    if temp_html_path.exists():
        os.remove(temp_html_path)

    return {
        "generation_id": gen_id,
        "filename": final_filename,
        "image_path": str(out_path),
        "format": format,
        "layout": layout
    }
