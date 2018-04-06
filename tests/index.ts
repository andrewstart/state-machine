describe('State Machine Library', function() {
	//core tests
	require('./creation.test');
	require('./transitions.test');
	require('./interruption.test');
	//extensions
	require('./exec.test');
	require('./wait.test');
});