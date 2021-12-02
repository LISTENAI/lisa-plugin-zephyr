import argparse
import sys
import os
import json
import pickle


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dtlib", required=True,
                        help="path to python-devicetree src")
    parser.add_argument("--edt-pickle", required=True,
                        help="path to read the pickled edtlib.EDT object from")
    return parser.parse_args()


def parse_reg(dct):
    node = {}
    if dct.addr is not None:
        node["addr"] = dct.addr
    if dct.size is not None:
        node["size"] = dct.size
    return node


def parse_phandle(dct):
    name = dct.__class__.__name__
    if name == "ControllerAndData":
        node = {
            "controller": dct.controller.path,
            "data": {},
        }
        if dct.name is not None:
            node["name"] = dct.name
        for item in dct.data:
            node["data"][item] = dct.data[item]
        return node
    elif name == "Node":
        return dct.path
    return None


def main():
    args = parse_args()
    sys.path.append(args.dtlib)

    with open(args.edt_pickle, 'rb') as f:
        edt = pickle.load(f)

        dt = {
            "chosens": {},
            "labels": {},
            "nodes": {},
        }

        for node in edt.chosen_nodes:
            path = edt.chosen_nodes[node].path
            dt["chosens"][node] = path

        for node in edt.nodes:
            json_node = {
                "path": node.path,
                "properties": {},
            }

            for label in node.labels:
                dt["labels"][label] = node.path

            for item in node.props:
                prop = node.props[item]

                if prop.type == "phandle":
                    json_node["properties"][item] = parse_phandle(prop.val)
                    continue

                if prop.type == "phandle-array":
                    handles = []
                    for phandle in prop.val:
                        handles.append(parse_phandle(phandle))
                    json_node["properties"][item] = handles
                    continue

                if item in ["compatible", "label", "status", "interrupts"]:
                    json_node[item] = prop.val
                    continue

                if item == "reg":
                    continue

                json_node["properties"][item] = prop.val

            if node.regs is not None:
                json_node["reg"] = []
                for reg in node.regs:
                    json_node["reg"].append(parse_reg(reg))

            dt["nodes"][node.path] = json_node

        print(json.dumps(dt))


if __name__ == '__main__':
    main()
