class CommandBox extends React.Component {
  constructor() {
    super();
    this.onCommandInputKeyUp = this.onCommandInputKeyUp.bind(this);
    this.state = {
      commandIndex: -1,
      commandsEntered: [],
      keys: {
        Enter: 13,
        Up: 38,
        Down: 40
      }
    };
  }
  componentDidMount() {
    // Make sure the command input box width is a consistant width based on the
    // width of the window.
    const $commandText = $("#commandText");

    this.setState({ commandText: $commandText });

    function resizeCommandInput() {
      $commandText.width(window.innerWidth - 50);
    }

    resizeCommandInput();

    $(window).resize((e) => {
      resizeCommandInput();
    });
  }
  onCommandInputKeyUp(e) {
    if(e.which === this.state.keys.Up) {
      let commandIndex = (this.state.commandIndex === -1) ?
                          this.state.commandsEntered.length - 1 :
                          --this.state.commandIndex;

      if(commandIndex < 0) {
        commandIndex = 0;
      }

      this.setState({ commandIndex: commandIndex}, function() {
        this.state.commandText.val(this.state.commandsEntered[commandIndex]);
      });

    } else if (e.which === this.state.keys.Down) {
      let commandIndex = (this.state.commandIndex === -1) ? 0 : ++this.state.commandIndex;

      if(commandIndex > this.state.commandsEntered.length) {
        commandIndex = this.state.commandsEntered.length;
      }

      this.setState({ commandIndex: commandIndex }, function() {
        this.state.commandText.val(this.state.commandsEntered[commandIndex]);
      });

    } else if(e.which === this.state.keys.Enter) {
      const textEntered = this.state.commandText.val();
      if(!(textEntered.length > 0)) return;

      this.state.commandText.val("");

      this.setState({
        commandsEntered: _.uniq(this.state.commandsEntered.concat([textEntered])),
        commandIndex: -1
      }, function() {
        if(this.props.onKeyEnter !== undefined) {
          this.props.onKeyEnter(textEntered);
        }
      });
    }
  }
  render() {
    const commandContainerStyle = {
      paddingLeft: "10px",
      position: "absolute",
      bottom: "10px"
    };

    const textInputStyle = {
      border: "none",
      outline: "none",
      paddingLeft: "2px"
    };

    return (
      <div id="commandContainer" style={commandContainerStyle}>
        &gt;<input id="commandText" style={textInputStyle} type="text" onKeyUp={this.onCommandInputKeyUp} autoFocus />
      </div>
    );
  }
}
