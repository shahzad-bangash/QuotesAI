from langgraph.graph import StateGraph, END
from app.agents.state import GraphState
from app.agents.nodes import content_agent_node, style_agent_node

def build_generation_graph():
    # 1. Initialize Graph
    workflow = StateGraph(GraphState)
    
    # 2. Add Nodes
    workflow.add_node("content_agent", content_agent_node)
    workflow.add_node("style_agent", style_agent_node)
    
    # 3. Define Edges (The Flow)
    workflow.set_entry_point("content_agent")
    workflow.add_edge("content_agent", "style_agent")
    workflow.add_edge("style_agent", END)
    
    # 4. Compile
    return workflow.compile()

# Singleton instance
generation_app = build_generation_graph()
