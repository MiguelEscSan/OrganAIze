Review the running app as a whole against this request and nothing else: {{title}}

{{description}}

Subtasks of the request and their acceptance criteria:

{{#subtasks}}
{{subtasks}}

{{/subtasks}}
Visible text of the running app:

{{renderedPage}}

{{#contextFiles}}
Project files (read-only context):

{{contextFiles}}

{{/contextFiles}}
Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string | null, "message": string}]}.

Use passed true with an empty failures list when the app fulfils the request and every acceptance criterion holds.

Use passed false with one failure per violated criterion.

In file put the exact project-relative path of the file responsible for the failure when you can tell, otherwise null.
