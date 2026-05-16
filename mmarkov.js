"use strict"
/*
 * markov.js
 *
 * Սկրիպտ, որը զրոյից կառուցում է տեքստ գեներացնող Մարկովյան շղթա։
 * Սկզբնական տարբերակը գրված էր Python-ով, իսկ սա դրա JavaScript
 * թարգմանությունն է։
 * 
 * Այս մոդելը օգտագործում է 2-գրամների one-hot ներկայացում՝
 * ընթացիկ տոկենի հիման վրա հաջորդ տոկենը
 * հավանականային եղանակով ընտրելու համար։
 * 
 * Օրինակ․
 * corpus = "..."
 * const markov = new AssociationTable();
 * const tokens = tokenize(corpus); // կամ cleanText(corpus)
 * markov.train(tokens);
 * markov.updateProbabilities();
 * const output = markov.genText(123);
 * 
 * AssociationTable օբյեկտը յուրաքանչյուր 2-գրամի համար
 * ստեղծում է AssociationEntry օբյեկտ։
 * Առաջին բառը կապվում է AssociationEntry-ի հետ,
 * իսկ երկրորդը՝ դրա ներսում գտնվող ListEntry-ի հետ։
 * 
 * Տեքստ գեներացնելու ընթացքում աղյուսակը սկսում է առաջին
 * բանալիից, ստուգում դրա ասոցիացիաները և հավանականությամբ
 * ընտրում հաջորդ բառը, որը դառնում է նոր ընթացիկ բառ։
 * Գործընթացը կրկնվում է այնքան ժամանակ, մինչև հասնենք
 * սահմանված տոկենների քանակին կամ այլևս անցում չլինի։
 * 
 * Իրականում սա կշռված ուղղորդված գրաֆի տեսքով
 * վերջավոր ավտոմատ է։
 * 
 * Մոտեցումը բավականին պարզեցված է․ այստեղ հաշվի չեն առնվում
 * խոսքի մասերը, նախադասությունների կառուցվածքը,
 * կրճատումները և այլն։
 * 
 * Նպատակն ավելի շատ գաղափարի ապացույց ստեղծելն էր,
 * ոչ թե լիարժեք NLP համակարգ։
 * Այնուամենայնիվ, սա հիանալի գործիք է NLP-ի հիմունքները
 * հասկանալու համար։
 */

/* AssociationEntry-ի ներսում պահվող մեկ տարր */
class ListEntry 
{
    #word;
    #frequency;
    #probability;

    /*
     * word         - ներկայացվող բառը
     * frequency    - տվյալ բառի հանդիպումների քանակը
     * probability  - հաջորդ բառ դառնալու հավանականությունը
     */
    constructor(word) 
    {
        this.#word = word;
        this.#frequency = 1;
        this.#probability = 0;
    }

    /*
     * Ստեղծում է պարզ օբյեկտ, որը հնարավոր է serialize անել
     *
     * Վերադարձնում է․ primitive օբյեկտ
     */
    makeCopyable()
    {
        let obj = 
        {
            frequency: this.#frequency
        };
        return obj;
    }

    /*
     * Վերադարձնում է հաճախականությունը
     */
    getFrequency()
    {
        return this.#frequency;
    } 

    /* Ավելացնում է հաճախականությունը 1-ով */
    inc() 
    {
        this.#frequency += 1;
    }

    /* Նվազեցնում է հաճախականությունը 1-ով */
    dec() 
    {
        this.#frequency -= 1;
    }

    /*
     * Վերահաշվում է հավանականությունը
     *
     * totalOccur - նախորդ բառի ընդհանուր հանդիպումների քանակը
     */
    updateProbability(totalOccur) 
    {
        if (!totalOccur) 
        {
            console.log("ERROR: updateProbability: totalOccur is 0");
            this.#probability = 0;
        }
        else
        {
            this.#probability = this.#frequency / totalOccur;
        }

    }

    /*
     * Ստուգում է՝ արդյոք փոխանցված բառը նույնն է
     */
    isWord(otherWord) 
    {
        return this.#word === otherWord;
    }

    /* Վերադարձնում է բառը */
    getWord() 
    {
        return this.#word;
    }

    /* Վերադարձնում է հավանականությունը */
    getProbability() 
    {
        return this.#probability;
    }
}

class AssociationEntry
{
    #word;
    #numOccur;
    #assocMap;
    #recalculatedProbabilities;

    /*
     * word      - ընթացիկ բառը
     * nextWord  - դրան հաջորդող բառը
     * numOccur  - քանի անգամ է հանդիպել ընթացիկ բառը
     * assocMap  - Map<string, ListEntry>
     * recalculatedProbabilities - արդյոք հավանականությունները հաշվարկված են
     */
    constructor(word, nextWord)
    {
        this.#word = word;
        this.#numOccur = 1;
        this.#recalculatedProbabilities = false;
        this.#assocMap = new Map();
        this.#assocMap.set(nextWord, new ListEntry(nextWord))
    }

    /*
     * Ստեղծում է serialize-ի համար հարմար օբյեկտ
     */
    makeCopyable()
    {
        let jsonTable = {};

        this.#assocMap.forEach((listEntry, word) =>
        {
            jsonTable[word] = listEntry.makeCopyable();
        });

        let obj = 
        {
            table: jsonTable
        };

        return obj;
    }

    /*
     * Վերադարձնում է ասոցիացիաների քարտեզը
     */
    getAssocMap()
    {
        return this.#assocMap;
    } 

    /*
     * Ավելացնում կամ թարմացնում է հաջորդ բառը
     */
    addWord(word)
    {
        this.#numOccur += 1;

        if (this.#assocMap.has(word))
        {
            const listEntry = this.#assocMap.get(word);
            listEntry.inc();
            this.#assocMap.set(word, listEntry);
        }
        else
            this.#assocMap.set(word, new ListEntry(word))

        this.#recalculatedProbabilities = false;
    }

    /*
     * Վերահաշվում է բոլոր հավանականությունները
     */
    updateProbabilities()
    {
        if (this.#recalculatedProbabilities)
            return;
        
        this.#assocMap.forEach((listEntry, word) => 
        {
            listEntry.updateProbability(this.#numOccur);
            this.#assocMap.set(word, listEntry);
        });

        this.#recalculatedProbabilities = true;
    }

    /*
     * Հավանականությամբ ընտրում է հաջորդ բառը
     */
    nextWord()
    {
        if (!this.#recalculatedProbabilities)
            console.log("ERROR: nextWord: probabilities not recalc'd");

        let randomNum = Math.random();
        let foundWord = false;
        let nextWord;

        this.#assocMap.forEach((listEntry, word) =>
        {
            if (foundWord)
                return;

            let prob = listEntry.getProbability();
  
            if (prob > randomNum)
            {
                foundWord = true;
                nextWord = word;
                random *= 0.85;
                return;
            }
            randomNum -= prob;
        });

        if (foundWord)
            return nextWord;

        console.log("ERROR: unable to generate random word");
        return null;
    }

}

/* Կառավարում է ամբողջ Մարկովյան մոդելը */
class AssociationTable
{
    #table;
    #recalculatedProbabilities;
    #wordsAnalyzed;

    /*
     * table - Map<string, AssociationEntry>
     * recalculatedProbabilities - արդյոք հավանականությունները թարմացված են
     * wordsAnalyzed - վերլուծված բառերի ընդհանուր քանակը
     */
    constructor()
    {
        this.#table = new Map();
        this.#recalculatedProbabilities = false;
        this.#wordsAnalyzed = 0;
    }

    /*
     * Վերականգնում է AssociationTable-ը JSON տողից
     */
    static fromCopyable(copyString)
    {
        let copyObj;
        try 
        {
            copyObj = JSON.parse(copyString);
        }
        catch(e) 
        {
            console.log("Unable to parse string in fromCopyable");
            console.log(e); 
            return null;
        }
        
        let newTable = new AssociationTable();

        for (const [word, assocEntry] of Object.entries(copyObj.table)) 
        {
            for (const [next_word, entry] of Object.entries(assocEntry.table))
            {
                if (word && next_word)
                    for (let i = 0; i < entry.frequency; ++i)
                        newTable.addWord(word, next_word);
            }
        }

        return newTable;
    }

    /*
     * Ստեղծում է JSON ներկայացում
     */
    makeCopyable()
    {
        let jsonTable = {};

        this.#table.forEach((assocEntry, word) =>
        {
            jsonTable[word] = assocEntry.makeCopyable();
        });

        let obj = 
        {
            table: jsonTable
        };

        return JSON.stringify(obj);
    } 

    /*
     * Միավորում է երկու մոդել
     */
    combine(assocTable)
    {
        let newTable = new AssociationTable();

        this.#table.forEach((assocEntry, word) => 
        {
            assocEntry.getAssocMap().forEach((listEntry, next_word) => 
            {
                let freq = listEntry.getFrequency();
                for (let i = 0; i < freq; ++i)
                    newTable.addWord(word, next_word);
            });
        });

        assocTable.#table.forEach((assocEntry, word) => 
        {
            assocEntry.getAssocMap().forEach((listEntry, next_word) => 
            {
                let freq = listEntry.getFrequency();
                for (let i = 0; i < freq; ++i)
                    newTable.addWord(word, next_word);
            });
        });

        return newTable;
    }

    /*
     * Ավելացնում կամ թարմացնում է բառը
     */
    addWord(word, nextWord)
    {
        this.#wordsAnalyzed += 1;

        if (this.#table.has(word))
        {
            const assocEntry = this.#table.get(word);
            assocEntry.addWord(nextWord);
            this.#table.set(word, assocEntry);
        }
        else
            this.#table.set(word, new AssociationEntry(word, nextWord));

        this.#recalculatedProbabilities = false;
    }

    /*
     * Վերադարձնում է վերլուծված բառերի քանակը
     */
    getWordsAnalyzed()
    {
        return this.#wordsAnalyzed;
    }

    /*
     * Թարմացնում է ամբողջ աղյուսակի հավանականությունները
     */
    updateProbabilities()
    {
        if (this.#recalculatedProbabilities)
            return;

        this.#table.forEach((assocEntry, word) =>
        {
            assocEntry.updateProbabilities();
            this.#table.set(word, assocEntry);
        });

        this.#recalculatedProbabilities = true;
    }

    /*
     * Սովորեցնում է մոդելը բառերի հաջորդականությամբ
     */
   train(tokens)
{
    for (let i = 0; i < tokens.length - 2; i++)
    {
        const key =
            tokens[i] + " " + tokens[i + 1];

        const next =
            tokens[i + 2];

        this.addWord(key, next);
    }
}

    /*
     * Մեծատառ է դարձնում առաջին նիշը
     */
    static capitalize(word)
    {
        if (!word.length)
            return word;

        const firstChar = word.charAt(0);
        if (firstChar.toLowerCase() != firstChar.toUpperCase()) 
        {
            return firstChar.toUpperCase() + word.slice(1);
        }
        else
            return word;
    }

    /*
     * Գեներացնում է տեքստ
     */
    genText(numTokens)
    {
        if (!this.#recalculatedProbabilities)
            console.log("ERROR: generating text w/o updating probs");

        let [prevWord] = this.#table.keys();
        let out = AssociationTable.capitalize(prevWord);

        let assocEntry;
        let nextWord;
        let wasPeriod = prevWord === ".";

        for (let i = 1; i < numTokens; ++i)
        {
            assocEntry = this.#table.get(prevWord);

            if (assocEntry === undefined)
                break;
            
            nextWord = assocEntry.nextWord();

            if (nextWord === null)
                break;

            if (!(nextWord === "." || nextWord === ","))
                out += " ";
            
            if (wasPeriod)
                out += AssociationTable.capitalize(nextWord);
            else
                out += nextWord;

            prevWord = nextWord;
            wasPeriod = prevWord === ".";
        }

        return out;
    }

    /*
     * Գեներացնում է տեքստ՝ սկսելով կոնկրետ բառից
     */
    seededGenText(seed, count)
{
    let words = seed.split(" ");

    if (words.length < 2)
        return {
            text: "Seed-ը պետք է լինի 2 բառ",
            path: []
        };

    let current =
        words[0] + " " + words[1];

    let output =
        current;

    let path = [];

    for (let i = 0; i < count; i++)
    {
        const assoc =
            this.#table.get(current);

        if (!assoc)
            break;

        const result =
            assoc.nextWord();

        if (!result)
            break;

        output += " " + result.word;

        path.push({
            from: current,
            to: result.word,
            probability:
                result.probability
        });

        /*
         * Sliding window
         */
        const parts =
            current.split(" ");

        current =
            parts[1] + " " + result.word;
    }

    return {
        text: output,
        path: path
    };
}
}
/*
 * Նախապատրաստում է տեքստը ուսուցման համար
 */
function cleanText(text)
{
    /* Նախադասության ավարտի նշաններ */
    text = text.replace(/[\.\?!;]+/g, " . ");

    /* Դադարի կամ բաժանման նշաններ */
    text = text.replace(/--|[,:()]+/g, " , ");

    /* Հեռացնում է չակերտները */
    text = text.replace(/\"/g, "");
    text = text.replace(/( \')|(\' )/g, "");

    /* Բոլորը դարձնում է փոքրատառ */
    text = text.toLowerCase();

    /* Հեռացնում է ավելորդ բացատները */
    text = text.replace(/[ \t\n]+/g, " ");

    /* I դերանվան ուղղում */
    text = text.replace(/ i /g, " I ");
    text = text.replace(/ i\'/g, " I\'");

    /* Բաժանում է բառերի */
    let textList = text.split(" ");

    /* Հեռացնում է դատարկ տարրերը */
    textList = textList.filter(word => word.length > 0);
/*
 * Հայերեն վերջակետեր
 */
text = text.replace(/։/g, ".");

/*
 * Հայերեն ստորակետ
 */
text = text.replace(/՝/g, ",");
    return textList;
}