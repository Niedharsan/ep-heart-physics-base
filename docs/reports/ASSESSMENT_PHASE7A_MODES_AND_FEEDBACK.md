# Assessment Phase 7A — Practice and Timed Assessment Modes

## Included

- Corrected interval feedback labels so landmark timing is not confused with numerical measurement accuracy.
- Practice mode remains untimed and repeatable.
- Mock mode starts a 20-minute timer only after the learner presses Start.
- Real-exam mode uses the same timing and locking behaviour.
- Timed answers remain editable until submission or timeout.
- Submission or timeout locks the current response.
- Timeout marks the current response even when the typed value or interpretation is blank.
- The real-exam route is hidden from the student view until activated from the instructor view.

## Current release-control boundary

The activation state is stored in browser local storage. This is appropriate for local demonstrations and classroom testing on managed devices, but it is not secure authentication. A production high-stakes exam requires server-side release state, authenticated instructor access, student identity, and server-recorded submissions.
