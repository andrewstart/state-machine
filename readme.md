Experiments with strongly typed state machine code that should be compatible with making a visual editing tool.

#### Goals
* Strongly typed code, including (as much as possible) transitions between states
* Usable in environments where you have multiple sessions running through the state machine simultaneously
* Useable in environments where you want to be able to pause a session, and restart it from serialized data
* Can be built with simple enough code that some sort of visual editing tool can be built to produce state machine code (with externally defined states)

#### Transition handling:
* All transitions are by name, with names beginning with `~` being considered an 'error' transition.
* A transition named by an empty string accepts all non-error transition names from the source state.
* Error transitions must be handled, or the state machine will reject immediately.
* Error transitions use a loose comparison method, so that `~Error` will catch both `~Error.Foo` and `~Error.Bar`.
`~` will catch all errors.

#### To do:
* Tests:
	* Stopping/interrupting state machines
	* Restarting state machines
	* BeginThread/EndThread decorators, InterruptThread state
	* Exec state
	* Wait state
	* SubMachine state
* Single Session StateMachine subclass - track the current session data
so that it does not need to be passed for `stop()` or `interrupt()` calls.
* Creation of additional basic states - something to wait for multiple parallel states to complete, for loop type thing?
* Figure out good way of "pausing" and restarting session

#### Decorator Ideas:
* Global decorators - debug via history trace; debug via active logging; callback for unit testing