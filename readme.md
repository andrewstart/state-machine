[![Build Status](https://travis-ci.org/andrewstart/state-machine.svg?branch=master)](https://travis-ci.org/andrewstart/state-machine)

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
	* Multiple sessions at once
* Documentation
	* Example(s)
* Creation of additional basic states - something to wait for multiple parallel states to complete, for loop type thing?
* Figure out good way of "pausing" and restarting session
* Do decorators (particularly local ones) run at the end of a state if the state was interrupted?

#### Decorator Ideas:
* Global decorators - debug via history trace; debug via active logging; callback for unit testing