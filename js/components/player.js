var Player = React.createClass({
	sound: null,
	playing: null,

	getInitialState: function() {
		return {
			queue: [], 
			playing: null
		};
	},

	componentDidMount: function() {
		this.props.events.subscribe({
			subscriber: this,
			event: ["playerPlay", "playerToggle", "playerStop", "playerEnqueue"]
		});
	},

	play: function(track) {
		if (this.state.queue.indexOf(track) < 0) this.enqueue([track]);

		this.stop();

		var _this = this;
		var streamUrl = this.props.subsonic.getStreamUrl({id: track.id});

		this.sound = soundManager.createSound({
			url: streamUrl
		}).play({
			onplay: function() {
				_this.props.events.publish({event: "playerStarted", data: track});
			},
			onresume: function() {
				_this.props.events.publish({event: "playerStarted", data: track});
			},
			onstop: function() {
				_this.props.events.publish({event: "playerStopped", data: track});
			},
			onpause: function() {
				_this.props.events.publish({event: "playerPaused", data: track});
			},
			whileplaying: function() {
				_this.props.events.publish({event: "playerUpdated", data: {track: track, duration: this.duration, position: this.position}});
			},
			onfinish: function() {

				// TODO onfinish not called for sound.destruct()

				_this.props.events.publish({event: "playerFinished", data: track});

				if (_this.state.queue.length > 0) {
					var idx = Math.max(0, _this.state.queue.indexOf(track));

					console.log("completed " + idx);

					if (idx < _this.state.queue.length - 1)	_this.play(_this.state.queue[++idx]);

					console.log("playing next track at " + idx);
				}
			}
		});

		this.setState({playing: track});
	},

	receive: function(event) {
		switch (event.event) {
			case "playerPlay": this.play(event.data); break;
			case "playerToggle": this.togglePlay(); break;
			case "playerStop": this.stop(); break;
			case "playerEnqueue": this.enqueue(event.data); break;
		}
	},

	togglePlay: function() {
		if (this.sound != null) {
			console.log("togglePlay: toggle");
			this.sound.togglePause();
		} else if (this.playing != null) {
			console.log("togglePlay: restart");
			this.play(this.playing);
		} else if (this.state.queue.length > 0) {
			console.log("togglePlay: start queue");
			this.play(this.state.queue[0]);
		}
	},

	stop: function() {
		if (this.sound != null) this.sound.destruct();
		this.sound = null;
	},

	enqueue: function(tracks) {
		var queue = this.state.queue;
		for (var i = 0; i < tracks.length; i++) queue.push(tracks[i]);

		console.log("queue", queue);

		this.setState({queue: queue});

		this.props.events.publish({event: "playerEnqueued", data: queue});
	},

	render: function() {
		var nowPlaying = "Nothing playing";
		var coverArt = <img src="px.png" />;

		if (this.state.playing != null) {
			nowPlaying = this.state.playing.title;
			coverArt = <CoverArt subsonic={this.props.subsonic} id={this.state.playing.coverArt} size={80} />;
		}

		return (
			<div className="ui basic segment player">
				<div className="ui items">
					<div className="ui item">
						<div className="ui tiny image">
							{coverArt}
						</div>
						<div className="content">
							<div className="header">{nowPlaying}</div>
							<div className="meta">
								<span className="stuff">moop</span>
							</div>
							<div className="description">
								<PlayerPriorButton key="prior" events={this.props.events} />
								<PlayerPlayToggleButton key="play" events={this.props.events} />
								<PlayerStopButton key="stop" events={this.props.events} />
								<PlayerNextButton key="next" events={this.props.events} />
								<PlayerProgress key="progress" events={this.props.events} />
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
});

var PlayerProgress = React.createClass({
	_id: UniqueID(),
	_bar: null,

	componentDidMount: function() {
		this.props.events.subscribe({
			subscriber: this,
			event: ["playerUpdated"]
		});
	},

	componentWillUnmount: function() {
	},

	receive: function(event) {
		switch (event.event) {
			case "playerUpdated": 
				this.playerUpdate(event.data.track, event.data.duration, event.data.position);
				break;
		}
	},

	playerUpdate: function(playing, length, position) {
		if (this._bar == null) this._bar = $('#' + this._id + " .bar");

		var percent = (position / length) * 100;
		this._bar.css("width", percent + "%");
	},

	render: function() {
		return (
			<div className="ui tiny red progress" id={this._id}>
				<div className="bar"></div>
			</div>
		);
	}
});

var PlayerPlayToggleButton = React.createClass({
	getInitialState: function() {
		return {paused: false, playing: false, enabled: false};
	},

	componentDidMount: function() {
		this.props.events.subscribe({
			subscriber: this,
			event: ["playerStarted", "playerStopped", "playerFinished", "playerPaused", "playerEnqueued"]
		});
	},

	componentWillUnmount: function() {
	},

	receive: function(event) {
		switch (event.event) {
			case "playerStarted": this.playerStart(event.data); break;
			case "playerStopped": 
			case "playerFinished": this.playerFinish(event.data); break;
			case "playerPaused": this.playerPause(event.data); break;
			case "playerEnqueued": this.playerEnqueue(event.data); break;
		}
	},

	playerStart: function(playing) {
		this.setState({paused: false, playing: true, enabled: true});
	},

	playerFinish: function(playing) {
		this.setState({paused: false, playing: false});
	},

	playerPause: function(playing) {
		this.setState({paused: true});
	},

	playerEnqueue: function(queue) {
		this.setState({enabled: queue.length > 0});
	},

	onClick: function() {
		this.props.events.publish({event: "playerToggle"});
	},

	render: function() {
		return (
			<button className={"ui circular icon button " + (this.state.enabled ? "" : "disabled")} onClick={this.onClick}>
				<i className={this.state.paused || !this.state.playing ? "play icon" : "pause icon"} />
			</button>
		);
	}
});

var PlayerStopButton = React.createClass({
	getInitialState: function() {
		return {enabled: false};
	},

	componentDidMount: function() {
		this.props.events.subscribe({
			subscriber: this,
			event: ["playerStarted", "playerStopped", "playerFinished"]
		});
	},

	componentWillUnmount: function() {
	},


	receive: function(event) {
		switch (event.event) {
			case "playerStarted": this.playerStart(event.data); break;
			case "playerStopped": 
			case "playerFinished": this.playerFinish(event.data); break;
		}
	},

	playerStart: function(playing) {
		this.setState({enabled: true});
	},

	playerFinish: function(playing) {
		this.setState({enabled: false});
	},

	onClick: function() {
		this.props.events.publish({event: "playerStop"});
	},

	render: function() {
		return (
			<button className={"ui circular icon button " + (this.state.enabled ? "" : "disabled")} onClick={this.onClick}>
				<i className="stop icon" />
			</button>
		);
	}
});

var PlayerNextButton = React.createClass({
	getInitialState: function() {
		return {enabled: false};
	},

	render: function() {
		return (
			<button className={"ui circular icon button " + (this.state.enabled ? "" : "disabled")} onClick={this.onClick}>
				<i className="fast forward icon" />
			</button>
		);
	}
});

var PlayerPriorButton = React.createClass({
	getInitialState: function() {
		return {enabled: false};
	},

	render: function() {
		return (
			<button className={"ui circular icon button " + (this.state.enabled ? "" : "disabled")} onClick={this.onClick}>
				<i className="fast backward icon" />
			</button>
		);
	}
});
