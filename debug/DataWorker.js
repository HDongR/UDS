onmessage = function(e) {
    console.log('Worker: Message received from main script');
    const result = e.data;
     
    postMessage('welcome:' + result); 
    sendTest(result.length);
}

function sendTest(len){
    let dataTest1 = (avg)=>console.log('kk', avg);
    let sumA = 1;
    let sumB = 4;

    let avg = sumA + sumB / len;
    return dataTest1(avg + 'what');
}