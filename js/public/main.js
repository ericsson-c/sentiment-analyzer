// globals
const sock = io();

const startData = {
    labels: [
      'Negative',
      'Positive'
    ],
    datasets: [{
      label: 'Tweet Sentiment',
      data: [1, 1],
      backgroundColor: [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)'
        //'rgb(0, 100, 238)'
      ],
      hoverOffset: 4
    }]
};


document.addEventListener('DOMContentLoaded', main);


function main() {

    // ---- Resizing new topic textbox on main page to fit user input ---- \\

    function resizeInput() {
        this.style.width = this.value.length + 0.5 + 'ch';
    }

    const input = document.querySelector('#new-topic-name input');
    input.addEventListener('input', resizeInput);


    // --- Displaying the pop-up questionnaire for new topic --- \\

    const newInputName = document.querySelector("#new-topic-name");
    
    // handle submit
    newInputName.addEventListener('submit', (e) => {
        e.preventDefault();

        document.querySelector('.content').style.opacity = "20%";
        document.querySelector('header').style.opacity = "20%";
        document.querySelector("#questionnaire div").style.display = "block";
        
        /*
        const underscores = document.querySelectorAll('#questionnaire p');
        underscores.forEach(p => {
            p.textContent = p.textContent.replace("REPL", input.value);
        });
        */
    
        document.querySelector("#questionnaire div").innerHTML = document.querySelector("#questionnaire div").innerHTML
        .replace(/REPL/g, input.value);


    // ---- Questionnarie content ---- \\

    document.querySelector("#questionnaire input").addEventListener('input', resizeInput);
    const q = document.getElementById('questionnaire');
    q.addEventListener('submit', e => {
        e.preventDefault();
        const qFormData = new FormData(q);
        const qRawData = {topic: input.value};
        for (const pair of qFormData.entries()) {
            qRawData[pair[0]] = pair[1]
        }
        console.log(qRawData);
        sock.emit('q', qRawData);

        // reset chart
        chart.data.datasets[0].data = [1, 1];
        chart.update();

        // reload page
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
    });

    // buttons at the end of the questionnaire
    document.querySelector("#questionnaire .btn button[type='button']").addEventListener('click', e => {
        document.querySelector('.content').style.opacity = "100%";
        document.querySelector('header').style.opacity = "100%";
        document.querySelector("#questionnaire div").style.display = "none";
    })
});


    // ----- Creating Donut Chart with Chart.js ----- \\

    const ctx = document.getElementById('chart');

    const chart = new Chart(ctx, {
        type:'doughnut',
        data: startData,
        options: {
            //radius: 200,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });


// ----- Defining WebSocket events with Socket.io ----- \\

    sock.on('topic', function(data) {
        input.value = data;
        resizeInput.call(input);
    });

    sock.on('tweet', function(data) {
      
        chart.data.datasets[0].data = [data.numPositive, data.numNegative];
        chart.update();
        console.log(data.tweet);
    
    });

    const startBtn = document.getElementById('start');
    const endBtn = document.getElementById('end');
    startBtn.addEventListener('click', (e) => {

        sock.emit('start');
        startBtn.style.display = 'none';
        endBtn.style.display = 'inline-block';
        
    });

    endBtn.addEventListener('click', (e) => {

        sock.emit('end');
        endBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';

    });

    document.getElementById('clear').addEventListener('click', (e) => {

        // reset donut chart to 50/50
        chart.data.datasets[0].data = [1, 1];
        chart.update();

        // emit reset event to reset server data as well
        sock.emit('reset');
    });
}