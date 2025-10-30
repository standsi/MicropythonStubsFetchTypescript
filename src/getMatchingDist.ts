/** module:getMatchingDist */

const comparisonRegex = /^(>=|<=|==|>|<)(.*)$/;

function parseComparison(input: string): { operator: string; value: string } | null {
    const match = input.match(comparisonRegex);
    if (match) {
        return {
            operator: match[1],
            value: match[2]
        };
    }
    return null;
}

export function getMatchingDist(availReleases: string[], versionSpec: string): string | undefined {
    const tests = versionSpec.replace('(', '').replace(')', '').split(',');
    let jstemplate = '';
    for (const test of tests) {
        const parseOp = parseComparison(test);
        if (parseOp) {
            jstemplate += " && '$$'" + `${parseOp.operator}'${parseOp.value}'`;
        }
    }
    if (jstemplate && jstemplate.length > 4) {
        jstemplate = jstemplate.slice(4);
    } else {
        return undefined;
    }
    const availReleasesDescending = availReleases.slice().sort().reverse();
    const verMatch = availReleasesDescending.find((ver) => {
        const js = jstemplate.replace(/\$\$/g, ver) + " ? true:false";
            const result: boolean = eval(js);
        return result;
    });
    if (verMatch) {
        return verMatch;
    }
    return undefined;
}

/*

const versionlist: string[] = ['0.9.0', '1.0.0', '1.0.0rc2', '1.0.1a0', '1.0.1a1', '1.0.1a2', '1.1.0', '1.1.1', '1.1.1a2', '1.1.2', '1.1.2a0', '1.23.0', '1.24.0', '1.24.1', '1.24.1.post2', '1.25.0', '1.26.0', '1.26.0.post1', '1.26.0.post2', '1.26.0.post3'];
const versionListDescending: string[] = versionlist.reverse();

const testexpression: string = '(>=1.1.0)';    //'(>=1.26.0,<1.27.0)';    //'(>=1.1.0)'
const tests = testexpression.replace('(', '').replace(')', '').split(',');
console.log(tests);
const testver: string = '1.26.1';
//const compare1:string='1.24.2';
//console.log(testver<compare1);
// find first version matching expression that meets all tests
// iterate through the tests to build a composite expression with $$ as version sub
let jstemplate = '';
for (const test of tests) {
    const parseOp = parseComparison(test);
    //    console.log(parseOp);
    if (parseOp) {
        jstemplate += " && '$$'" + `${parseOp.operator}'${parseOp.value}'`;
    }
}
if (jstemplate && jstemplate.length > 4) {
    jstemplate = jstemplate.slice(4);
}
console.log(jstemplate);



if (jstemplate) {
    //const parseOp=parseComparison(tests[0]);
    const verMatch = versionListDescending.find((ver) => {
        console.log(jstemplate.replace(/\$\$/g, ver));
        const js = jstemplate.replace(/\$\$/g, ver) + " ? true:false";
        const result: boolean = eval(js);
        return result;
    });
    console.log(verMatch);
}
/*
    if(parseOp){
        const js="'"+testver+"'"+parseOp.operator+"'"+parseOp.value+"'"+"? 1:0";
        console.log(js);
        const result=eval(js);
        console.log(result);
    }
}
*/
