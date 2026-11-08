/**
 * Speech & Text Command Parser for Hunt the Wumpus
 */

const NUMBER_WORDS = {
    'zero': 0, 'one': 1, 'two': 2, 'to': 2, 'too': 2, 'three': 3, 'four': 4, 'for': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'ate': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
};

export class CommandParser {
    /**
     * Parse raw speech or typed text into a structured game command
     * @param {string} rawInput 
     * @param {object} context - current prompt state (e.g. { waitingFor: 'action' | 'move_room' | 'shoot_rooms' })
     */
    static parse(rawInput, context = {}) {
        if (!rawInput || typeof rawInput !== 'string') return null;

        const cleaned = rawInput.trim().toLowerCase();
        if (!cleaned) return null;

        // Extract any numbers or number-words
        const extractedNumbers = CommandParser.extractNumbers(cleaned);

        // 1. Direct mode selection
        if (cleaned === 'm' || cleaned === 'move') {
            return { type: 'SELECT_MOVE' };
        }
        if (cleaned === 's' || cleaned === 'shoot' || cleaned === 'fire') {
            return { type: 'SELECT_SHOOT' };
        }
        if (cleaned === 'y' || cleaned === 'yes') {
            return { type: 'YES' };
        }
        if (cleaned === 'n' || cleaned === 'no') {
            return { type: 'NO' };
        }
        if (cleaned === 'help' || cleaned === '?') {
            return { type: 'HELP' };
        }
        if (cleaned === 'restart' || cleaned === 'new game' || cleaned === 'new') {
            return { type: 'RESTART' };
        }

        // 2. Full move phrase (e.g. "move to 14", "go to room 5", "move 12")
        if (cleaned.startsWith('move') || cleaned.startsWith('go to') || cleaned.startsWith('go')) {
            if (extractedNumbers.length > 0) {
                return { type: 'MOVE', room: extractedNumbers[0] };
            }
            return { type: 'SELECT_MOVE' };
        }

        // 3. Full shoot phrase (e.g. "shoot 15, 6, 16", "fire into 12 and 14")
        if (cleaned.startsWith('shoot') || cleaned.startsWith('fire')) {
            if (extractedNumbers.length > 0) {
                return { type: 'SHOOT', rooms: extractedNumbers.slice(0, 5) };
            }
            return { type: 'SELECT_SHOOT' };
        }

        // 4. Contextual input when waiting for specific prompt
        if (context.waitingFor === 'move_room' && extractedNumbers.length > 0) {
            return { type: 'MOVE', room: extractedNumbers[0] };
        }

        if (context.waitingFor === 'shoot_rooms' && extractedNumbers.length > 0) {
            return { type: 'SHOOT', rooms: extractedNumbers.slice(0, 5) };
        }

        // 5. Bare number input (e.g. user just said "14" or "15, 6, 16")
        if (extractedNumbers.length === 1) {
            // Default to move if in action prompt, or move_room
            if (context.waitingFor === 'shoot_rooms') {
                return { type: 'SHOOT', rooms: [extractedNumbers[0]] };
            }
            return { type: 'MOVE', room: extractedNumbers[0] };
        }

        if (extractedNumbers.length > 1) {
            return { type: 'SHOOT', rooms: extractedNumbers.slice(0, 5) };
        }

        return { type: 'UNKNOWN', raw: rawInput };
    }

    /**
     * Extract integer values (from numeric digits or written English words)
     */
    static extractNumbers(text) {
        // Split by whitespace, commas, hyphens, and punctuation
        const tokens = text.toLowerCase().replace(/[,.:\-–]/g, ' ').split(/\s+/).filter(Boolean);
        const numbers = [];

        for (const token of tokens) {
            const digitMatch = token.match(/\d+/);
            if (digitMatch) {
                const num = parseInt(digitMatch[0], 10);
                if (num >= 1 && num <= 20) {
                    numbers.push(num);
                }
            } else if (NUMBER_WORDS[token] !== undefined) {
                const num = NUMBER_WORDS[token];
                if (num >= 1 && num <= 20) {
                    numbers.push(num);
                }
            }
        }

        return numbers;
    }
}
