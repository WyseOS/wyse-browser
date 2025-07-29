# Worklets

## Definition

```JSON
{
    "type": "worklet",
    "name": "",
    "version": "0.1.0",
    "dependencies": [],
    "actions": [
        {
            "name": "",
            "description": "",
            "cmd_input": [],
            "cmd_output": []
        }
    ],
    "properties": {},
    "base_dir": "worklets/flow_end/src"
}
```

## Available Worklets

| Name  | Description | Manifest |
|----------|-------------|-----------|
| FlowStart | Start a flow | [FlowStart](./flow_start/manifest.json) |
| FlowEnd | End a flow | [FlowEnd](./flow_end/manifest.json) |  
| Twitter | Twitter search, send tweet, like, retweet | [Twitter](./twitter/manifest.json) |
| IOUtil | Convert json to csv | [IOUtil](./io_util/manifest.json) |
