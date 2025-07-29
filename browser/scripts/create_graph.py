# Generate a graph from a JSON flow manifest
# usage:
#     pip install graphviz
#     python create_graph.py

import json
import graphviz

COLORS = {
    "cmd": "#0f0",
}

CONNECTION_TYPES = ["cmd"]

def color(c):
    if c in COLORS:
        return COLORS[c]
    return "#000"

def find_node(nodes, name):
    for node in nodes:
        if node["name"] == name:
            return node
    return None

def create_graph(json_data):
    graph = graphviz.Digraph("G", filename="graph.gv")
    graph.graph_attr["rankdir"] = "LR"
    graph.graph_attr["dpi"] = "150"
    graph.graph_attr["splines"] = "true"
    graph.attr("node", shape="none")

    # Add nodes
    nodes = json_data["nodes"]
    connections = json_data["connections"]

    for node in nodes:
        node["i_ports"] = []
        node["o_ports"] = []
        
    for node in nodes:
        if node["type"] != "worklet":
            continue
        for connection in connections:
            if connection["worklet"] == node["name"]:
                for connection_type in CONNECTION_TYPES:
                    if connection_type in connection:
                        data = connection[connection_type]
                        for item in data:
                            node["o_ports"].append(item["src"])
                            for dest in item["dest"]:
                                dest_node = find_node(nodes, dest["worklet"])
                                if dest_node:
                                    dest_node["i_ports"].append(item["src"])

    for node in nodes:
        if node["type"] != "worklet":
            continue
        node["i_ports"] = set(node["i_ports"])
        node["o_ports"] = set(node["o_ports"])
        print("====iports: ", node["name"], node["i_ports"])
        print("====oports: ", node["name"], node["o_ports"])
        iports = ""
        for port in node["i_ports"]:
            iports += f'<tr><td align="left" port="i_{port}">⊙ {port}</td></tr>'
        oports = ""
        for port in node["o_ports"]:
            oports += f'<tr><td align="right" port="o_{port}">{port} ⊙</td></tr>'

        # Use HTML-like label for nodes
        label = f"""<
        <table border="0" cellborder="1" cellspacing="0">
            <tr><td colspan="2" bgcolor="#ddd"><b>{node["name"]}</b></td></tr>
            <tr><td colspan="2">type:<br/>{node["type"]}</td></tr>
            <tr><td colspan="2">version:<br/>{node["version"]}</td></tr>
            <tr><td>
                <table border="0" cellspacing="0">{iports}</table>
            </td>
            <td>
                <table border="0" cellspacing="0">{oports}</table>
            </td>
        </tr>    
        </table>>"""
        graph.node(node["name"], label)

    # Add edges to the graph
    # for connection in connections:
    #     for connection_type in CONNECTION_TYPES:
    #         if connection_type in connection:
    #             for data in connection[connection_type]:
    #                 for dest in data["dest"]:
    #                     graph.edge(
    #                         f'{connection["src"]}:o_{data["name"]}',
    #                         f'{dest["worklet"]}:i_{data["name"]}',
    #                         color=color(data["name"]),
    #                         label=connection_type,
    #                     )
    # Save the graph to a file
    #print(graph.source)
    graph.render("graph", format="png")
    graph.view()

# Load the JSON data
with open("./twitter_search_save_csv/manifest.json") as f:
    data = json.load(f)

# Create the graph
create_graph(data)