Experiments with strongly typed state machine code that should be compatible with making a visual editing tool.

#### Transition handling:
* All transitions are by name, with names beginning with `~` being considered an 'error' transition.
* A transition named by an empty string accepts all non-error transition names from the source state.
* Error transitions must be handled, or the state machine will reject immediately.
* Error transitions use a loose comparison method, so that `~Error` will catch both `~Error.Foo` and `~Error.Bar`.
`~` will catch all errors.

#### To add:
* `StateMachine.interrupt()` method - inject an error into the state machine, cancelling the current state
* Threading - Allow for a 'main' thread, that is when the general state machine starts & ends, and
parallel threads that are started within the machine and can communicate with the main thread via
interrupts + other mechanisms
* StateMachine mode: Single session or multi-session - enable threads in single session (perhaps always enabled?) and track
the current session data so that it does not need to be passed for `stop()` or `interrupt()` calls.
* Tracing what states have been run/transitions taken for debugging purposes
* Creation of additional basic states - SubFlow, Throw, Catch, something to wait for multiple parallel states to complete