var express = require('express');
var router = express.Router();
const tf = require('@tensorflow/tfjs'); //if you have an error install @tensorflow/tfjs
const model = tf.sequential();


const a =
    '.#####.' +
    '#.....#' +
    '#.....#' +
    '#######' +
    '#.....#' +
    '#.....#' +
    '#.....#'
;
const b =
    '######.' +
    '#.....#' +
    '#.....#' +
    '######.' +
    '#.....#' +
    '#.....#' +
    '######.'
;
const c =
    '#######' +
    '#......' +
    '#......' +
    '#......' +
    '#......' +
    '#......' +
    '#######'
;

// converting our data in the json format

const trainingSet = [
    {hash: 22,sym:0,nb:1, nbSep: 7, label: 'A'},
    {hash: 26,sym:1,nb:0, nbSep: 6,label: 'B'},
    {hash: 19,sym:1,nb:2, nbSep: 1,label: 'C'},
    ];

const testSet = [ {hash: 22,sym:0,nb:1, nbSep: 7,label: 'A'},
  {hash: 26,sym:1,nb:0, nbSep: 6,label: 'B'},
  {hash: 19,sym:1,nb:2, nbSep: 1,label: 'C'}];

// create training data with tensor
const trainingData = tf.tensor2d(
    trainingSet.map(item => [
      item.hash,
      item.sym,
      item.nb,
      item.nbSep,
    ]),
    [3, 4]
);

// create test data with tensor
const testData = tf.tensor2d(
    testSet.map(item => [
      item.hash,
      item.sym,
      item.nb,
      item.nbSep,
    ]),
    [3, 4]
);

// create our oupout format
const outputData = tf.tensor2d(trainingSet.map(item => [
  item.label === 'A' ? 1 : 0,
  item.label === 'B' ? 1 : 0,
  item.label === 'C' ? 1 : 0,

]), [3,3]);


//create our model using 2 layers
const createModel = () => {
  model.add(tf.layers.dense(
      {
        inputShape: 4,
        activation: 'sigmoid',
        units: 10
      }
  ));

  model.add(tf.layers.dense(
      {
        inputShape: 10,
        units: 3,
        activation: 'softmax'
      }
  ));
  model.compile({
    loss: "categoricalCrossentropy",
    optimizer: tf.train.adam()
  });
};


// create our prediction function
const predict = async inputData => {


  let newDataTensor = tf.tensor2d(
      inputData,
      [1, 4]
  );

  let prediction = model.predict(newDataTensor);

  let arr = prediction.dataSync();
  let indexOfMaxValue = arr.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
  let letterPrediction;

  switch (indexOfMaxValue) {
    case 0:
      letterPrediction = "A";
      break;
    case 1:
      letterPrediction = "B";
      break;
    case 2:
      letterPrediction = "C";
      break;
    default:
      letterPrediction = "";
      break;
  }

  return letterPrediction + " % =>" + (parseFloat(arr[indexOfMaxValue]*100).toFixed(3)).toString();
};

async function train_data(){
  for(let i=0;i<15;i++){
    const res = await model.fit(trainingData, outputData,{epochs: 40});
  }
}




/* GET home page. */
router.get('/', function(req, res, next) {

  res.render('index', { title: 'REST API ' });
});
router.post('/check_letter', function(req, res, next) {
  let data = req.body;
  let letters = data.code!== undefined?data.code:"";

  //format our data into array of 4 numbers

  const length = letters.length;
  if (length > 0){
    if(length > 49){
      letters = letters.substr(0,49);
    }
    else{
      for (let i = length;i< 49;i++){
        letters.concat(".");
      }
    }
    let NbHashTag = 0;
    let NbHashTagSuccessif = 0;
    for (let i = 0; i< length;i++){
      if(["#","."].includes(letters[i])){
        if(letters[i] === "#"){
          NbHashTag++;
        }
      }
      else{
        letters[i] = ".";
      }

    }

    let sym = 1;

    for (let i = 0;i<3;i++){
      let last = 7*(i+1);
      if(letters.substr(7*i,7) === letters.substr(49 - last,7)){
        sym = sym*sym;
      }else{
        sym = 0;
        i = 3;
      }
    }

    for (let i = 0;i<7;i++){

      if(letters.substr(i*7,7) === "#######"){
        NbHashTagSuccessif++;
      }

    }

    let NbMiddle = 0;
    let mid = letters.substr(21,7);
    for (let i=0;i<mid.length;i++){
      if(mid[i]==="#"){
        NbMiddle++;
      }
    }

    createModel();

    train_data().then(()=>{


      let result = predict([NbHashTag,sym,NbHashTagSuccessif,NbMiddle]);
      result.then((r)=>{
        console.log(r);
        res.status(200).json({answer: r});
      }).catch((e)=>{
        console.log(e);
        res.status(200).json({answer: "not found"});
      })


    }).catch((e)=>{
      console.log("error");
      console.log(e);
    })


  }
  else{
    res.status(200).json({answer: "not found"});
  }


});

module.exports = router;
