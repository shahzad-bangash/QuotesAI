from app.rendering.text_layout import TextLayoutEngine, LayoutOverflowError

class LayoutValidator:
    def __init__(self, style_config: dict):
        self.style = style_config
        self.engine = TextLayoutEngine(style_config)

    def validate(self, quote: str):
        """
        Validates if the quote can physically fit inside the rendering boundaries.
        Throws a LayoutOverflowError if it cannot.
        """
        # The layout engine itself will throw if it cannot fit
        layout = self.engine.layout(quote)
        
        # Verify the dimensions returned are within limits
        max_height = self.engine.max_height
        if layout["total_height"] > max_height:
            raise LayoutOverflowError(f"Layout exceeds maximum allowed height ({layout['total_height']} > {max_height})")
            
        return layout
