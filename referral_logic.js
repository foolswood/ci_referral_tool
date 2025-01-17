function validate_input(test_results) {
    const limits = {ac: [-10,120], bc: [-10,70]};
    const interval = 5;

    for (const ear of ['left','right']) {
        for (const type of ['ac','bc']) {
            for (const freq in test_results[ear][type]) {
                if ((test_results[ear][type][freq] !== null)) { //null used to represent 'no response' at given frequency
                    try {
                        const point = test_results[ear][type][freq];
                        if ((!Number.isInteger(point)) || (point % interval !== 0) || (point < limits[type][0]) || (point > limits[type][1])) {
                            return {valid: false, problem: [ear,type,freq]};
                        }
                    }
                    catch(err) {
                        return {valid: false, problem: [ear,type,freq]};
                    }
                }
            }
        }
    }
    return {valid: true};
}

function check_threshold_count(test_results, ear, type, freqs, threshold) {
    //For ear ('left' or 'right'), type ('ac' or 'bc'), freqs (kHz but as string), and a threshold (int, dB)
    //this function returns how many of those frequencies are at the threshold or worse

    let threshold_count = 0;
    for (const f of freqs) {
        if (test_results[ear][type][f] !== undefined) {
            if (test_results[ear][type][f] !== null) {
                if (test_results[ear][type][f] >= threshold) {
                    threshold_count += 1;
                }
            }
            else {
                threshold_count += 1; //null means 'not reached', counts as worse than threshold
            }
        }
    }
    return threshold_count;
}

function process_results(test_results) {
    const validity = validate_input(test_results);
    if (!validity.valid) {
        return "Invalid input for " + validity.problem[0] + " " + validity.problem[1] + " " + validity.problem[2];
    }

    //First need to check we have enough data to run the tool (distinct from input validation above, which checks individual inputs are of correct format)
    for (const f of ['0.5','1','2','3','4']) {
        for (const ear of ['left','right']) {
            let types = ['ac'];
            if (test_results.loss_type === 'mixed') {
                types.push('bc'); //If 'mixed' need to have BC points too
            }
            for (const type of types) {
                if (test_results[ear][type][f] === undefined) {
                    return "Must provide value for " + ear + " " + type + " at " + f + "kHz to use this tool";
                }
            }
        }
    }

    if ((check_threshold_count(test_results, 'left', 'ac', ['0.5','1','2','3','4'], 80) < 2) && (check_threshold_count(test_results, 'right', 'ac', ['0.5','1','2','3','4'], 80) < 2)) {
        return "Not suitable for CI unless dead regions suspected and AB speech test scores below 50%";
    }

    if (test_results.loss_type === 'sensorineural') {
        if ((check_threshold_count(test_results, 'left', 'ac', ['2','3','4'], 95) == 3) && (check_threshold_count(test_results, 'right', 'ac', ['2','3','4'], 95) == 3)) {
            return "Likely suitable for CI referral. If hearing without visual cues then consider AB speech test, if not consider CI referral.";
        }
        return "May be suitable for CI referral. Next step: AB speech test.";
    }
    else if (test_results.loss_type === 'mixed') {
        if ((check_threshold_count(test_results, 'left', 'bc', ['0.5','1','2','3','4'], 1000) > 1) && (check_threshold_count(test_results, 'right', 'bc', ['0.5','1','2','3','4'], 1000) > 1)) {
            return "May be suitable for CI referral. Next step: AB speech test.";
        }
        return "Consider ENT/BAHA referral.";
    }

    throw "Unexpected loss type";
}