var wumpus_help = `<h1>WELCOME TO 'HUNT THE WUMPUS'</h1>

THE WUMPUS LIVES IN A CAVE OF 20 ROOMS: EACH ROOM HAS 3 TUNNELS LEADING TO OTHER
ROOMS. THE STANDARD MAP IS A DODECAHEDRON (IF YOU DON'T KNOW WHAT A
DODECAHEDRON IS, ASK SOMEONE)

***
<b><u>HAZARDS:</b></u>
BOTTOMLESS PITS - TWO ROOMS HAVE BOTTOMLESS PITS IN THEM
IF YOU GO THERE: YOU FALL INTO THE PIT (& LOSE!)

SUPER BATS  - TWO OTHER ROOMS HAVE SUPER BATS. IF YOU GO THERE, A BAT GRABS YOU
AND TAKES YOU TO SOME OTHER ROOM AT RANDOM. (WHICH MIGHT BE TROUBLESOME)

<b><u>WUMPUS:</b></u>
THE WUMPUS IS NOT BOTHERED BY THE HAZARDS (HE HAS SUCKER FEET AND IS TOO BIG FOR
A BAT TO LIFT). USUALLY HE IS ASLEEP. TWO THINGS WAKE HIM UP: YOUR ENTERING HIS
ROOM OR YOUR SHOOTING AN ARROW.

IF THE WUMPUS WAKES, HE EATS YOU IF YOU ARE THERE, OTHERWISE, HE MOVES (P=0.75)
ONE ROOM OR STAYS STILL (P=0.25). AFTER THAT, IF HE IS WHERE YOU ARE, HE EATS
YOU UP (& YOU LOSE!)

<b><u>YOU:</b></u>
EACH TURN YOU MAY MOVE OR SHOOT A CROOKED ARROW
MOVING: YOU CAN GO ONE ROOM (THRU ONE TUNNEL)
ARROWS: YOU HAVE 5 ARROWS. YOU LOSE WHEN YOU RUN OUT.

EACH ARROW CAN GO FROM 1 TO 5 ROOMS: YOU AIM BY TELLING THE COMPUTER THE ROOMS
YOU WANT THE ARROW TO GO TO. IF THE ARROW CAN'T GO THAT WAY (IE NO TUNNEL) IT
MOVES AT RANDOM TO THE NEXT ROOM.

IF THE ARROW HITS THE WUMPUS: YOU WIN.

IF THE ARROW HITS YOU: YOU LOSE.

<b><u><u>WARNINGS:</b></u></u>
WHEN YOU ARE ONE ROOM AWAY FROM WUMPUS OR HAZARD, THE COMPUTER SAYS:

WUMPUS - 'I SMELL A WUMPUS'

BAT - 'I HEAR BATS'

PIT - 'I FEEL A DRAFT'

***
<h1>HUNT THE WUMPUS</h1>`

 // Function to handle keydown event
 function handleKeyDown(event) {
	if (event.keyCode === 13) { // 13 is the keycode for Enter key
		processInput();
	}
}

// Function to handle button click
function handleButtonClick() {
	processInput();
}

// Function to process the input
function processInput() {
	const input = document.getElementById('input');
	const text = input.value;
	
	// Append the new text to the log
	appendToLog(text);
	
	// Clear the input box
	input.value = '';
	
	// Scroll to the bottom
	const log = document.getElementById('log');
	log.scrollTop = log.scrollHeight;
}
        
// Function to append text to the log
function appendToLog(text) {
const log = document.getElementById('log');

// Create a new log entry
const entry = document.createElement('div');
entry.innerHTML = text.replace(/\n/g, '<br>'); // Replace \n with <br> tags

// Append the entry to the log
log.appendChild(entry);
}

// Continuously update the log (for demonstration purposes)
// setInterval(function() {
//     const randomText = Math.random().toString(36).substring(2);
//     appendToLog(randomText);
	
//     // Scroll to the bottom
//     const log = document.getElementById('log');
//     log.scrollTop = log.scrollHeight;
// }, 1000);
appendToLog(wumpus_help)