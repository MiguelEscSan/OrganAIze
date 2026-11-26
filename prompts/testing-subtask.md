Review this subtask against its acceptance criteria and nothing else: {{title}}

Acceptance criteria:

{{#acceptanceCriteria}}
{{acceptanceCriteria}}

{{/acceptanceCriteria}}
Current content of the files:

{{#files}}
{{files}}

{{/files}}
{{#renderedPage}}
Visible text of the running app:

{{renderedPage}}

{{/renderedPage}}
Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string, "line": number | null, "message": string}]}.

Use passed true with an empty failures list when every criterion holds.

Use passed false with one failure per violated criterion, naming the file and line when possible.
