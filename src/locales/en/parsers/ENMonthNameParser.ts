import { FULL_MONTH_NAME_DICTIONARY, MONTH_DICTIONARY } from "../constants";
import { ParsingContext } from "../../../chrono";
import { findYearClosestToRef } from "../../../calculation/years";
import { matchAnyPattern } from "../../../utils/pattern";
import { YEAR_PATTERN, parseYear } from "../constants";
import { AbstractParserWithWordBoundaryChecking } from "../../../common/parsers/AbstractParserWithWordBoundary";

const PATTERN = new RegExp(
    `((?:in)\\s*)?` +
        `(?:(?:(${YEAR_PATTERN})(?:\\s*-\\s*|\\s+(?:of\\s+)?)))?` +
        `(${matchAnyPattern(MONTH_DICTIONARY)})` +
        `\\s*` +
        `(?:` +
        `(?:,|-|of)?\\s*(${YEAR_PATTERN})?` +
        ")?" +
        "(?=[^\\s\\w]|\\s+[^0-9]|\\s+$|$)",
    "i"
);

const PREFIX_GROUP = 1;
const LEADING_YEAR_GROUP = 2;
const MONTH_NAME_GROUP = 3;
const YEAR_GROUP = 4;

/**
 * The parser for parsing month name and year.
 * - January, 2012
 * - January 2012
 * - January
 * (in) Jan
 */
export default class ENMonthNameParser extends AbstractParserWithWordBoundaryChecking {
    innerPattern(): RegExp {
        return PATTERN;
    }

    innerExtract(context: ParsingContext, match: RegExpMatchArray) {
        const rawMonthName = match[MONTH_NAME_GROUP];
        const monthName = rawMonthName.toLowerCase();

        // skip some unlikely words "jan", "mar", ..
        if (match[0].length <= 3 && !FULL_MONTH_NAME_DICTIONARY[monthName]) {
            return null;
        }

        if (match[LEADING_YEAR_GROUP] && rawMonthName === "may") {
            const textAfterMatch = context.text.substring(match.index + match[0].length);
            if (textAfterMatch.match(/^\s*[a-z]/)) {
                return null;
            }
        }

        const resultStartIndex =
            match[LEADING_YEAR_GROUP] && match[YEAR_GROUP]
                ? match.index + match[0].indexOf(match[MONTH_NAME_GROUP])
                : match.index + (match[PREFIX_GROUP] || "").length;
        const result = context.createParsingResult(resultStartIndex, match.index + match[0].length);
        result.start.imply("day", 1);
        result.start.addTag("parser/ENMonthNameParser");

        const month = MONTH_DICTIONARY[monthName];
        result.start.assign("month", month);

        if (match[YEAR_GROUP]) {
            const year = parseYear(match[YEAR_GROUP]);
            result.start.assign("year", year);
        } else if (match[LEADING_YEAR_GROUP]) {
            const year = parseYear(match[LEADING_YEAR_GROUP]);
            result.start.assign("year", year);
        } else {
            const year = findYearClosestToRef(context.refDate, 1, month);
            result.start.imply("year", year);
        }

        return result;
    }
}
