# n8n-nodes-llmgraph

This is an n8n community node. It lets you use [LLMGraph](https://llmgraph.ai) in your n8n workflows.

LLMGraph is a no-code LLM workflow builder: you design AI workflows visually as a graph, then deploy them to a public REST API. This node invokes those deployed workflows from n8n.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Verified community node status](#verified-community-node-status)
- [Resources](#resources)
- [Version history](#version-history)

## Installation

### In the n8n GUI (recommended)

1. In n8n, go to Settings, then Community Nodes.
2. Select Install.
3. Enter `n8n-nodes-llmgraph` in the npm package name field.
4. Agree to the risks of using community nodes and select Install.

Community nodes require a self-hosted n8n instance, or availability as a verified community node on n8n Cloud. See the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

### Via npm (manual, self-hosted)

From your n8n custom nodes directory (`~/.n8n/custom` by default):

```shell
npm install n8n-nodes-llmgraph
```

Then restart n8n.

## Operations

The LLMGraph node supports one operation:

- Invoke Workflow: send a JSON payload to a deployed LLMGraph workflow and return its JSON output as the item data.

Parameters:

- Request Body: a JSON object sent as the request body. Defaults to `{}`. Your workflow's input nodes read their values from this object.
- User Input: a convenience text field. When set, it is merged into the request body as the `user_input` property. Handy for single-input workflows and for use as an AI agent tool.

## Credentials

You need an LLMGraph account with a deployed workflow.

1. Sign in at [llmgraph.ai](https://llmgraph.ai) and open your workflow's deployment page.
2. Copy the deployment endpoint URL. It looks like `https://llmgraph.ai/api/<graph_id>/<environment>`.
3. Copy the deployment API key.
4. In n8n, create new LLMGraph API credentials and paste both values.

Note: LLMGraph deployment endpoints only accept POST requests, so the credential test performs a real invocation of your workflow with an empty JSON body (`{}`). The test is smart about the outcome: an HTTP 422 run failure still counts as a successful test, because it proves the URL and key are valid even when the workflow needs input. Only authentication and reachability problems (for example 401, 403, 404, or a network error) fail the test.

## Usage

1. Add the LLMGraph node to your workflow.
2. Select your LLMGraph API credentials.
3. Set the Request Body to the JSON your deployed workflow expects, or just fill in User Input for simple workflows.
4. Run the workflow. The node outputs the JSON returned by your LLMGraph workflow.

The node maps LLMGraph API errors to clear messages: 422 means the workflow run failed, 504 means it timed out, 403 means the deployment is disabled, 402 indicates a billing issue, and 429 means you are rate limited. Enable "Continue On Fail" on the node to receive these as error items instead of stopping the workflow.

The node is marked as usable as a tool, so AI agents in n8n can call your deployed LLMGraph workflows as tools. On self-hosted n8n, you must set the environment variable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` for community nodes to be available as tools.

## Compatibility

Built and tested against n8n 1.x with `n8nNodesApiVersion` 1. Requires a Node.js version supported by your n8n instance.

## Verified community node status

This package follows n8n's [verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md): it was scaffolded with the official n8n-node CLI, is written in TypeScript, has no runtime dependencies, does not touch environment variables or the file system, and is MIT licensed. Submission for verified community node status happens through the [n8n Creator Portal](https://creators.n8n.io/nodes) after the package is published to npm via GitHub Actions with provenance (see `.github/workflows/publish.yml`).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [LLMGraph](https://llmgraph.ai)

## Version history

- 0.1.0: initial release with the Invoke Workflow operation and LLMGraph API credentials.
