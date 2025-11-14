# Wyse Flows

## Base Definition

```JSON
{
    "name": "",
    "type": "flow",
    "description": "",
    "version": "0.1.0",
    "webpage_url": "",
    "nodes": [
        {
            "name": "FlowStart",
            "type": "worklet",
            "version": "0.1.0"
        },
        {
            "name": "",
            "type": "worklet",
            "version": "0.1.0",
            "properties": {}
        },
        {
            "name": "FlowEnd",
            "type": "worklet",
            "version": "0.1.0"
        }
    ],
    "connections": [
        {
            "name": "start the flow, send a tweet",
            "src": {
                "worklet": "FlowStart",
                "action": ""
            },
            "dest": [
                {
                    "worklet": "Twitter",
                    "action": ""
                }
            ]
        },
        {
            "name": "flow ends",
            "src": {
                "worklet": "",
                "action": ""
            },
            "dest": [
                {
                    "worklet": "FlowEnd",
                    "action": "action_flow_end"
                }
            ]
        }
    ],
    "properties": {},
    "parameters": []
}
```

| Category | Name | Description | Manifest |
|----------|------|-------------|-----------|
