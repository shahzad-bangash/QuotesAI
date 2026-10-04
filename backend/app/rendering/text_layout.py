import math
from pathlib import Path
from PIL import ImageFont

BASE_DIR = Path(__file__).parent.parent.parent

class LayoutOverflowError(Exception):
    pass

class TextLayoutEngine:
    def __init__(self, style_config: dict):
        self.style = style_config
        
        # Load constraints
        base_max_width = self.style.get("text", {}).get("max_width", 800)
        self.max_width = base_max_width - 50  # 50px safety margin for PIL vs Browser rendering diff
        self.min_font_size = self.style.get("text", {}).get("min_font_size", 30)
        self.max_font_size = self.style.get("text", {}).get("max_font_size", 100)
        self.max_height = self.style.get("text", {}).get("max_height", 400)  # Reduced from 500 to 400 to prevent overlap
        self.line_height_mult = 1.2
        
        font_file = self.style.get("text", {}).get("font_file", "Inter-Bold.ttf")
        self.font_path = str(BASE_DIR / "assets" / "fonts" / font_file)

    def wrap_text(self, text: str, font: ImageFont.FreeTypeFont) -> list[str]:
        # First, split by explicit newlines to preserve paragraph breaks
        paragraphs = text.split('\n')
        lines = []
        
        for paragraph in paragraphs:
            # If there's multiple spaces, split() without args will clean them up,
            # but we want to preserve the newline structure.
            words = paragraph.split()
            if not words:
                lines.append("") # Empty line for consecutive newlines
                continue
                
            current_line = []
            for word in words:
                # Check width if we add this word
                test_line = " ".join(current_line + [word])
                bbox = font.getbbox(test_line)
                width = bbox[2] - bbox[0]
                
                if width > self.max_width:
                    if current_line:
                        # Current line is full, push it and start new line
                        lines.append(" ".join(current_line))
                        current_line = [word]
                    else:
                        # Single word is wider than max_width! Force it anyway (or break it)
                        lines.append(word)
                        current_line = []
                else:
                    current_line.append(word)
                    
            if current_line:
                lines.append(" ".join(current_line))
                
        return lines

    def layout(self, quote: str) -> dict:
        font_size = self.max_font_size
        
        while font_size >= self.min_font_size:
            try:
                font = ImageFont.truetype(self.font_path, font_size)
            except IOError:
                raise RuntimeError(f"Could not load font from {self.font_path}")
            
            lines = self.wrap_text(quote, font)
            total_height = len(lines) * font_size * self.line_height_mult
            
            if total_height <= self.max_height:
                return {
                    "lines": lines,
                    "font_size": font_size,
                    "total_height": total_height,
                    "line_height": font_size * self.line_height_mult
                }
                
            font_size -= 2
            
        # If we reach here, it means the quote is too long even for min_font_size.
        # Instead of throwing an error, we gracefully fallback to an even smaller font,
        # or just use the smallest we tried and let it overflow slightly.
        # This prevents the backend from crashing on long quotes.
        fallback_font_size = max(16, self.min_font_size - 10)
        try:
            font = ImageFont.truetype(self.font_path, fallback_font_size)
        except IOError:
            raise RuntimeError(f"Could not load font from {self.font_path}")
            
        lines = self.wrap_text(quote, font)
        return {
            "lines": lines,
            "font_size": fallback_font_size,
            "total_height": len(lines) * fallback_font_size * self.line_height_mult,
            "line_height": fallback_font_size * self.line_height_mult
        }
