Implement this subtask: {{title}}

{{description}}

Acceptance criteria:

{{#acceptanceCriteria}}
{{acceptanceCriteria}}

{{/acceptanceCriteria}}
{{#previousFailures}}
Previous failures of this subtask, oldest first; do not repeat any of them:

{{previousFailures}}

{{/previousFailures}}
{{#lastFeedback}}
Feedback from the last review, fix every point:

{{lastFeedback}}

{{/lastFeedback}}
You may write only these files: {{files}}

Current content of those files:

{{#currentFiles}}
{{currentFiles}}

{{/currentFiles}}
{{#contextFiles}}
Other files in the project (read-only, do not modify them; import and use their real exports):

{{contextFiles}}

{{/contextFiles}}
{{#siblings}}
Other subtasks of this request (they may write their files at the same time; refer to their files by path):

{{siblings}}

{{/siblings}}
Any file that contains JSX must end in .tsx, never .ts.

Reply with JSON only, in the form {"files":[{"path":"...","content":"full file content"}]}.

Include the full content of every file you change. Do not write any other path.
