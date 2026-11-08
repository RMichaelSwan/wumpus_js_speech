/**
 * Classic Terminal Console for Hunt the Wumpus
 */
export class TerminalUI {
    constructor(containerEl, inputEl, onCommandSubmitted) {
        this.container = containerEl;
        this.input = inputEl;
        this.onCommandSubmitted = onCommandSubmitted || (() => {});
        this.history = [];
        this.historyIndex = -1;

        this._setupInputListeners();
    }

    _setupInputListeners() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = this.input.value.trim();
                if (text) {
                    this.history.push(text);
                    this.historyIndex = this.history.length;
                    this.input.value = '';
                    this.print(`> ${text}`, 'user-command');
                    this.onCommandSubmitted(text);
                }
            } else if (e.key === 'ArrowUp') {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.input.value = this.history[this.historyIndex];
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.input.value = this.history[this.historyIndex];
                } else {
                    this.historyIndex = this.history.length;
                    this.input.value = '';
                }
                e.preventDefault();
            }
        });
    }

    print(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.innerHTML = text.replace(/\n/g, '<br>');
        this.container.appendChild(line);
        this.scrollToBottom();
    }

    printWarning(text) {
        this.print(text, 'warning-line');
    }

    printResult(text, isPositive = false) {
        this.print(text, isPositive ? 'success-line' : 'danger-line');
    }

    printStatus(status) {
        // Warnings
        if (status.nearPit) this.printWarning('I feel a draft');
        if (status.nearBats) this.printWarning('I hear bats!');
        if (status.nearWumpus) this.printWarning('I smell a wumpus!');

        // Location & exits
        const exitsStr = `[${status.exits.join(', ')}]`;
        this.print(`You are in room ${status.hunter}. Tunnels lead to ${exitsStr}.`);

        if (status.visibleOnly && status.visibleOnly.length > 0) {
            this.print(`You can also see (but cannot get to) [${status.visibleOnly.join(', ')}].`);
        }
    }

    printHelp() {
        const helpText = `<b><u>WELCOME TO 'HUNT THE WUMPUS'</u></b><br>
THE WUMPUS LIVES IN A CAVE OF 20 ROOMS: EACH ROOM HAS 3 TUNNELS LEADING TO OTHER ROOMS. THE STANDARD MAP IS A DODECAHEDRON.<br><br>
<b><u>HAZARDS:</u></b><br>
BOTTOMLESS PITS - TWO ROOMS HAVE BOTTOMLESS PITS. IF YOU GO THERE, YOU FALL IN (& LOSE!)<br>
SUPER BATS - TWO ROOMS HAVE SUPER BATS. IF YOU GO THERE, A BAT GRABS YOU AND TAKES YOU TO A RANDOM ROOM.<br><br>
<b><u>WUMPUS:</u></b><br>
THE WUMPUS IS ASLEEP UNTIL YOU ENTER HIS ROOM OR SHOOT AN ARROW. IF HE WAKES, HE MOVES (P=0.75) OR STAYS (P=0.25). IF HE IS WHERE YOU ARE, HE EATS YOU!<br><br>
<b><u>COMMANDS:</u></b><br>
• <b>m &lt;room&gt;</b> or <b>move to &lt;room&gt;</b> - Move to connected room<br>
• <b>s &lt;r1, r2, ...&gt;</b> or <b>shoot &lt;r1, r2, ...&gt;</b> - Shoot arrow through up to 5 rooms<br>
• <b>Clicking 3D Nodes</b> or <b>Voice Speech</b> also controls your character directly!`;
        this.print(helpText, 'help-line');
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    clear() {
        this.container.innerHTML = '';
    }

    focusInput() {
        this.input.focus();
    }
}
