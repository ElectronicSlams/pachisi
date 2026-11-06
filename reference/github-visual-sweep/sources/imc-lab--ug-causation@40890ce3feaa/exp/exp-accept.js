/* A convenience function for creating check questions */
function check_q(name, text, choices, correctAns, loopUntilCorrect=true, required=true) {
  let shuffledChoices = jsPsych.randomization.shuffle(choices);
  let inputHTML = "<div align='left'>";
  shuffledChoices.forEach(function (c) {
    inputHTML = inputHTML +
    '<input style="float: left; display: block; margin-top: 8px;" type="radio" id="' + c +
    '" name="' + name + '" value="' + c + '"><label for="' + c +
    '" style="font-size: 12px; display: block; margin-left: 35px;">' +
    c + '</label>'
  });
  inputHTML = inputHTML + '</div><br>';

  return {
    timeline: [{
      type: jsPsychSurveyHtmlForm,
      html: "<p>" + text + "</p>" + inputHTML,
      data: {stage: "check"}
    }],
    on_finish: function (data) {
      data.response = data.response[name];
      data.measure = name;
      data.choices = shuffledChoices;
      data.button_pressed = shuffledChoices.indexOf(data.response);
      delete data.responses;
    },

    loop_function: function (data) {
      let response = data.values()[0].response;
      let responded = response != undefined;
      let correct = response == choices[correctAns];

      if (required && !responded) {
        alert('Please respond to the question.');
        return true;
      }

      if (responded && loopUntilCorrect && !correct) {
        alert('Your response is incorrect. Please try again.');
        return true;
      }
      return false;
    }
  };
}

// sample an offer using a truncated normal distribution around mu
function sampleOffer(mu, sigma=STAKES/20, min=0, max=STAKES) {
  if (typeof mu == "string")
  mu = parseFloat(mu.substr(1));
  return Math.min(Math.max(jStat.normal.sample(mu, sigma), min), max);
}

function offerProb(offer, max=STAKES) {
  return jStat.beta.pdf(offer / max,
    jsPsych.timelineVariable('alpha', true),
    jsPsych.timelineVariable('beta', true))
  }

  /* create timeline */
  var accept_timeline = [];
  var ACCEPT_TRIALS = 0;

  /* instructions trials */
  var instructions_pages_accept = [
    "<p>Please pay attention and carefully read the following instructions. In addition to clicking on the buttons, you may use the left and right arrow keys to navigate and to make quicker responses.</p><p>In this study, you are going to play a game.</p>" +
    "There are two players: you, and a partner. In every round of this game, you and your partner receive " + STAKES_TXT + " ($" + STAKES.toFixed(2) +
    "), and you must decide how to split it between the two of you.</p><br><p>Here's how it works:</p>",
    "<p>First, your partner will offer you some portion of the money.</p><p>They can offer you any amount between $0.00 and $" + STAKES.toFixed(2) + ".</p>",
    "<p>Once your partner makes an offer, you may either accept or reject this offer.</p>" +
    "<p>If you accept the offer, then you will receive the amount of money offered to you, and your partner will get the rest.</p>" +
    "<p>If you reject the offer, then nobody gets any money in that round.</p><br>",
    "<p>Since you will be playing this game many times, you will <b>not</b> receive money from every round of the game. " +
    "<b>But, both of you will receive the amount of money that you earn from a randomly selected round of the game as a bonus. </b></p>" +
    "<p>For example, if you accepted an offer of $4.00 on the randomly chosen round, you will receive a bonus of $4.00 and your partner will receive a bonus of $6.00 after the study is completed. " +
    "But, if you rejected your partner's offer of $4.00, neither you nor your partner will receive a bonus at all.</p>" +
    "<p><b>So, make sure to play each round like real money is up for grabs- you never know which round of the game you will get a bonus from!</b></p>",
    "<p>Sometimes, after learning the outcome for a round of a game, you will be asked whether you made money (or not) because your partner made that particular offer as opposed to some other offer. Then you'll be asked to rate how confident you are.</p><p>For this set of questions, please rate whether your partner’s offer caused you to win money (or not) during this round.</p>"];

    if (BLOCKS > 1) {
      instructions_pages_accept.push("<p>One last thing: we want to learn what you think of your partner in this game. " +
      "So, we'll alternate between playing the game for a few rounds and asking what you think of your partner.</p>",
      "<p>You'll be shown two possible offers, and you will be asked:</p><br><p>\"Which offer is more likely?\"</p><br>" +
      "<p><b>Please choose the offer amount that your partner is most likely to have offered.</b></p>",
      "<p>Sometimes it may seem like both offers are equally likely. " +
      "Even if it's hard to tell, try to pick the offer that feels most likely. " +
      "You do not need to spend too much time thinking about each choice.</p>");
    }

    var instructions_accept = {
      type: jsPsychInstructions,
      pages: instructions_pages_accept.concat("You're now finished with the instructions."),
      show_clickable_nav: true
    };

    function instructions_UG_accept(block) {
      return {
        type: jsPsychInstructions,
        pages: ["<p>Great work, you've completed block " + block + " out of " + BLOCKS + "!</p>" +
        "<p>Now, we will let you play with your partner some more.</p>"],
        show_clickable_nav: true,
        data: { stage: 'instructions' }
      }
    }

    var instructions_mcmc_accept = {
      type: jsPsychInstructions,
      pages: ["<p>Great work!</p><br><p>Now, we want to learn what you think of your partner.</p>",
      "<p>You'll be shown two possible offers, and you will be asked:</p><br><p>\"Which offer is more likely?\"</p><br>" +
      "<p><b>Please choose the offer amount that your partner is most likely to have offered.</b></p>",
      "<p>Sometimes it may seem like both offers are equally likely. " +
      "Even if it's hard to tell, try to pick the offer that feels most likely. " +
      "You do not need to spend too much time thinking about each choice.</p>"],
      show_clickable_nav: true,
      data: { stage: 'instructions' }
    };

    var waiting_instructions = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "Waiting for your partner to finish the instructions...",
      choices: 'NO_KEYS',
      trial_duration: function() { return jStat.gamma.sample(20, 500); },  // mean of 10s, sd of 2.36s
      data: { stage: 'iti' }
    }

    var waiting_offer = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "Waiting for your partner to make an offer...",
      choices: 'NO_KEYS',
      trial_duration: function() { if (TEST) return 0; else return jStat.gamma.sample(10, 250); }, // mean of 2.5s, sd of .79s
      data: { stage: 'iti' }
    }

    if (!TEST) {
      accept_timeline.push(instructions_accept);
      ACCEPT_TRIALS = ACCEPT_TRIALS + 1;
    }

    /* Display check questions and loop until correct */
    var check_choices = ["You get the amount of money specified in the offer, but your partner gets nothing.",
    "Neither player receives any money",
    "Your partner gets the amount of money specified in the offer, and you get the rest.",
    "You get the amount of money specified in the offer, and your partner gets the rest."];
    if (!TEST) {
      accept_timeline.push(check_q("check1", "Check question: what happens when you accept an offer?", check_choices, 3),
      check_q("check2", "Check question: what happens when you reject an offer?", check_choices, 1));
      ACCEPT_TRIALS = ACCEPT_TRIALS + 2;
    }

    // jsPsych timeline for an ultimatum game trial
    var UGTrial = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        return "<p>Your partner has offered you $" +
        jsPsych.timelineVariable('offer', true) + " out of $" +
        STAKES.toFixed(2) + ".</p>" +
        "<p>Do you accept this offer?</p><br>"
      },
      choices: ["No", "Yes"],
      trial_duration: TRIAL_DURATION,
      button_html: LR_BUTTONS,
      on_start: ALLOW_KEYPRESS,
      on_finish: function (data) {
        DISABLE_KEYPRESS();
        data.measure = "UG";
        data.stage = jsPsych.timelineVariable('stage', true);
        data.offer = jsPsych.timelineVariable('offer', true);
        data.prob = offerProb(data.offer);

        // calculate reward
        if (data.response == 1)
          data.earned = jsPsych.timelineVariable('offer', true);
        else
          data.earned = "0.00";
      }
    };

    // Ask for a causal judgment after the player accepts/rejects
    var causeTrial = {
      type: jsPsychHtmlSliderResponse,
      labels: ["not at all", "totally"], trial_duration: TRIAL_DURATION,
      min: 0, max: 1, step: 'any', require_movement: true,
      stimulus: function () {
        d = jsPsych.data.getLastTrialData().values()[0];
        color = (d.response == 1) ? 'green' : 'red';
        return "<p>You have " + (d.response == 1 ? 'accept' : 'reject') + "ed your partner's offer of $" +
        d.offer + " out of $" + STAKES.toFixed(2) + ".</p>" +
        "<p style='color: " + color + ";'>As a result, you have earned $" + d.earned + ".</p><br>" +
        "<p><b>To what extent did you earn $" + d.earned +
        " in this round because your partner made an offer of $" +
        d.offer + "?</b></p>"
      },
      on_load: function () {
        document.getElementById('jspsych-html-slider-response-response').classList.add('hidden');
        document.getElementById('jspsych-html-slider-response-response').addEventListener('click', function (e) {
          e.target.classList.remove('hidden');
        });
      },
      on_finish: function (data) {
        d = jsPsych.data.getLastTrialData().values()[0];
        data.stage = jsPsych.timelineVariable('stage', true);
        data.offer = jsPsych.timelineVariable('offer', true);
        data.prob = offerProb(data.offer);
        data.measure = "cause";
      }
    };
    var confidenceTrial = {
      type: jsPsychHtmlSliderResponse,
      labels: ["not at all", "totally"], trial_duration: TRIAL_DURATION,
      min: 0, max: 1, step: 'any', require_movement: true, post_trial_gap: POST_TRIAL_GAP,
      stimulus: function () {
        d = jsPsych.data.get().last(2).first(1).values()[0];
        d2 = jsPsych.data.getLastTrialData().values()[0];
        color = (d.response == 1) ? 'green' : 'red';
        return "<p>You have " + (d.response == 1 ? 'accept' : 'reject') +
        "ed your partner's offer of $" + d.offer +
        " out of $" + STAKES.toFixed(2) + ".</p>" +
        "<p style='color: " + color + ";'>As a result, you have earned $" + d.earned + ".</p><br>" +
        "<p><b>To what extent did you earn $" + d.earned +
        " in this round because your partner made an offer of $" + d.offer + "?</b></p>" +
        '<div class="jspsych-image-slider-response-container" style="position:relative; margin: 0 auto 3em auto;">' +
        "<input type='range' class='jspsych-slider' disabled='true' style='width: 100%' min='0' max='1' step='any' value='" + d2.response + "'>" +
        '<div><div style="display: inline-block; position: absolute; left:-50%; text-align: center; width: 100%;">' +
        '<span style="text-align: center; font-size: 80%;">not at all</span></div>' +
        '<div style="display: inline-block; position: absolute; left:50%; text-align: center; width: 100%;">' +
        '<span style="text-align: center; font-size: 80%;">totally</span></div></div></div><br>' +
        "<p><b>How confident are you in your response to the previous question?</b></p>"
      },
      on_load: function () {
        document.getElementById('jspsych-html-slider-response-response').classList.add('hidden');
        document.getElementById('jspsych-html-slider-response-response').addEventListener('click', function (e) {
          e.target.classList.remove('hidden');
        });
      },
      on_finish: function (data) {
        data.stage = jsPsych.timelineVariable('stage', true);
        data.offer = jsPsych.timelineVariable('offer', true);
        data.prob = offerProb(data.offer);
        data.measure = "confidence";
      }
    };

    var feedbackTrial = {
      type: jsPsychInstructions,
      trial_duration: TRIAL_DURATION,
      show_clickable_nav: true,
      post_trial_gap: POST_TRIAL_GAP,
      pages: function () {
        d = jsPsych.data.getLastTrialData().values()[0];
        color = (d.response == 1) ? 'green' : 'red';
        return ["<p>You have " + (d.response == 1 ? 'accept' : 'reject') + "ed your partner's offer of $" + d.offer +
        " out of $" + STAKES.toFixed(2) + ".</p>" +
        "<p style='color: " + color + ";'>As a result, you have earned $" + d.earned + ".</p><br>"];
      }
    };

    // learning trials
    function accept_block(params, block_number) {
      return {
        timeline_variables: params,
        randomize_order: true,
        data: {block: block_number},
        timeline: [waiting_offer, UGTrial,
          {
            timeline: [feedbackTrial],
            conditional_function: function() {
              return jsPsych.timelineVariable('stage', true) == 'learn';
            }
          },
          {
            timeline: [causeTrial, confidenceTrial],
            conditional_function: function() {
              return jsPsych.timelineVariable('stage', true) == 'test';
            }
          }]
        };
      }

      // mcmc trials
      function mcmc_block(n_trials, block_number) {
        // create parameters for a single trial for each chain
        let params = [...Array(N_MCMC_CHAINS).keys()].map(function(c) {
          o = { ...player };
          o.choices = ["$" + (jStat.beta.sample(player.alpha, player.beta) * STAKES).toFixed(2),
          "$" + (jStat.beta.sample(player.alpha, player.beta) * STAKES).toFixed(2)];
          o.chain = c + 1;
          return o;
        });

        return {
          timeline_variables: params,
          repetitions: n_trials,
          randomize_order: true,
          data: {stage: 'mcmc', measure: 'mcmc', block: block_number},
          timeline: [{
            type: jsPsychHtmlButtonResponse,
            stimulus: "<p>Which offer is your partner more likely to make?</p>",
            choices: function () {
              let c = jsPsych.timelineVariable('choices', true);
              lastTrial = jsPsych.data.get().filter({
                stage: 'mcmc',
                chain: jsPsych.timelineVariable('chain', true)
              }).last(1).values()[0];

              // If possible, use the last response as the Markov state
              if (lastTrial != undefined) {
                c[0] = "$" + lastTrial.response.toFixed(2);
              }

              // Sample the alternative choice using a proposal distribution
              c[1] = "$" + sampleOffer(c[0]).toFixed(2);
              while (c[1] == c[0]) {
                c[1] = "$" + sampleOffer(c[0]).toFixed(2);
              }

              return [...jsPsych.randomization.shuffle(c)];
            },
            trial_duration: TRIAL_DURATION,
            post_trial_gap: POST_TRIAL_GAP,
            button_html: LR_BUTTONS,
            on_start: ALLOW_KEYPRESS,
            on_finish: function(data) {
              DISABLE_KEYPRESS();
              data.choices = jsPsych.getCurrentTrial().choices.map(function (x) {return parseFloat(x.substr(1))});
              data.response = data.choices[data.response];
              data.chain = jsPsych.timelineVariable('chain', true);
            }
          }]
        };
      }

      // create a set of timeline parameters for learning/test trials
      var UGParams = jsPsych.randomization.shuffle(Array(N_LEARN).fill().map(function () {
        let o = { ...player };
        o.offer = (jStat.beta.sample(player.alpha, player.beta) * STAKES).toFixed(2);
        o.stage = 'learn';
        return o;
      }).concat([...Array(N_TEST).keys()].map(function (i) {
        let o = { ...player };
        //o.offer = (STAKES * (i / (N_TEST-1))).toFixed(2);
        o.offer = (jStat.uniform.sample(0, STAKES)).toFixed(2);
        o.stage = 'test';
        return o;
      })));

      // split the trials into blocks, and add them to the timeline
      for (block=0; block<BLOCKS; block++) {
        // add learning trials for this block
        if (block > 0) {
          accept_timeline.push(instructions_UG_accept(block));  // intermediate instructions
          ACCEPT_TRIALS = ACCEPT_TRIALS + 1;
        }

        if (!TEST) {
          accept_timeline.push(waiting_instructions);
          ACCEPT_TRIALS = ACCEPT_TRIALS + 1;
        }

        let UGTrials = accept_block(UGParams.slice(block*N_UG_PER_BLOCK, (block+1)*N_UG_PER_BLOCK), block+1);
        accept_timeline.push(UGTrials);
        ACCEPT_TRIALS = ACCEPT_TRIALS + UGTrials.timeline_variables.length * UGTrials.timeline.length;

        // add mcmc trials for this block
        let mcmc_trials = mcmc_block(N_MCMC_PER_BLOCK, block+1);
        accept_timeline.push(instructions_mcmc_accept);   // intermediate instructions
        accept_timeline.push(mcmc_trials);
        ACCEPT_TRIALS = ACCEPT_TRIALS + 1 + mcmc_trials.repetitions * mcmc_trials.timeline_variables.length;
      }
