var lang = 'en';
var sound_status = 1;
// var isSocketOpen = false;
// var intentionalClosure = false;
// var tradeData;
// var Socket

function openPage(url) {
    sc();
    $(".slider_menu").hide();
    $.ajax({
        url: url,
        type: 'get',
        error: function () {

        },
        success: function (data) {
            $('#page').html(data);
            $('#page').fadeIn();
            // $('#page').show();
        }
    });
}

function closePage() {
    $('#page').fadeOut();
    $('#page').hide();
    sc();
    $('.slider_menue').fadeOut();
    // $(".slider_menu").hide();
}


var rankings = new Array();
function _ranking() {
    $.ajax({
        url: '/traderoom/rankingdata',
        type: 'post',
        data: { 'json': 1 },
        dataType: "json",
        error: function () {
            setTimeout(function () { _ranking(); }, 45000);
        }.bind(this),
        success: function (data) {
            rankings = data;
            rankings_();
            setTimeout(function () { _ranking(); }, 30000);
        }.bind(this)

    });
}


function binaryTime() {
    if (!serverdata.relogios) return;
    let obj = $('#w1');
    let input = obj.find('input[name="binarytime"]');
    let temp_restante = obj.find('.temp_restante');
    let selects_time = obj.find('.selects_time');

    let tempo = new Date(serverdata.relogios[input.val()]);
    // Diferença em milissegundos
    let diffMs = serverdata.relogios[input.val()] - serverdata.time;

    // Converter para segundos e milissegundos
    let totalSeg = Math.floor(diffMs / 1000);
    let hour = Math.floor(totalSeg / 60 / 60);
    let minutos = Math.floor(totalSeg / 60 % 60);
    let segundos = totalSeg % 60;

    temp_restante.html(`${String(hour).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`);
    let hourSelect = Math.floor(input.val() / 60 / 60);
    let minuteSelect = input.val() / 60 % 60;
    selects_time.html(`${String(input.val() / 60)}M`);//html(`${String(tempo.getHours()).padStart(2, "0")}:${String(tempo.getMinutes()).padStart(2, "0")}`);//html(`${String(minuteSelect).padStart(2, "0")}:${String(0).padStart(2, "0")}`); // agora dividido por 60000 (ms → minutos)
}

function binaryTimeList() {
    if (!serverdata.relogios) return;
    $('.binarytimes_list > div').each(function () {
        let input = $(this).attr('value');
        let tempo = new Date(serverdata.relogios[input]);
        let diffMs = serverdata.relogios[input] - serverdata.time;

        let totalSeg = Math.floor(diffMs / 1000);
        let minutos = Math.floor(totalSeg / 60);
        let segundos = totalSeg % 60;

        $(this).find('.tempo_binario').html(`${String(input / 60)}M`)//html(`${String(tempo.getHours()).padStart(2, "0")}:${String(tempo.getMinutes()).padStart(2, "0")}`);
        //$(this).find('.tempo_restante').html(`${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`);
    });
}


function rankings_() {
    let periodo = $('select[name="periodoRanking"]').val();
    let operadores = (periodo === 'today') ? rankings.today : (periodo === 'three') ? rankings.three : rankings.seven;
    if (operadores) {

        $("#ranking_container").html('');
        let i = 1;
        operadores.forEach(op => {
            let nome = (op.o) ? op.o : op.i + ' ' + op.f;
            let desde = new Date(op.time * 1000 + 999).toLocaleDateString();
            let valores = (op.profit > 25000) ? '+ R$ 25.000,00' : 'R$ ' + Number(op.profit).toLocaleString('pt-br', { minimumFractionDigits: 2 })
            let foto = (op.photo) ? op.photo : 'img/account/photo.png';
            let html = '';
            html += '<div class="item_rank">';
            html += '<div class="item_rank_left">';
            html += '<p class="item_rank_' + i + '" style="min-width: 15px; background: var(--color1); border-radius: 4px; height: 15px; display: flex; align-items: center; justify-content: center;">' + i + '</p>';
            html += '<img class="item_rank_img" src="' + foto + '" />'
            html += '<div><p>' + nome + '</p></div>';
            html += '</div>';
            html += '<p>' + valores + '</p>';
            html += '</div>';

            $("#ranking_container").append(html);
            i++;
        });
    }
}



function operacoes() {

    var lots = userdata.lots_open;
    if (lots) {
        $("#op_container").html('');
        lots.forEach(op => {
            let html = '';
            html += '<div id="lot_' + op.id + '" class="operacao" style="display: flex;flex-direction: row;justify-content: space-between;border-top: 1px solid #1c1c1c;padding: 7px 0; align-items: center;">';
            html += '<div class="clock_container"><div start="' + op.time_start + '" end="' + op.time_end + '" class="timer"><div class="donat outer-circle"><p class="clock-time clock-timer"><p></div></div></div>';
            html += '<div><div class="item" style="display: flex;align-items: center;gap: 5px;"><div class="currency_ico"><img width="18px" src="img/ativos/' + op.currency_k + '.png" /></div><div class="currency" style="font-size: 14px"><b>' + op.currency + '</b></div></div><p style="font-size: 12px">Crypto</p></div>';
            html += '<div style="font-size: 12px"><p style="color: var(--verdeSaldo);"><b class="profit"> R$ ' + op.profit + '</b></p><p style="display: flex;align-items: center;gap: 5px;font-size: 10px;">R$ ' + op.lot + ' <iconify-icon icon="bxs:' + op.trend + '-arrow" style="font-size: 10px;"></iconify-icon></p></div>'
            html += '</div>';

            $("#op_container").append(html);
        });

    }

}

function historico() {
    var lots = userdata.lots_close;

    if (lots) {
        $("#op_container_close").html('');

        lots.forEach(op => {


            let cor = 'vermelho';
            if (op.profit <= 0) {
                cor = 'vermelho'
            } else {
                cor = 'verdeSaldo'
            }
            let cat = {
                7: 'Opções',
                8: 'Crypto',
                9: 'Stock', 
                10: 'Metais',
                11: 'Indices'
            }
            let time = new Date(op.time_start * 1000);
            let categoria = op.isCopy ? "CopyTrader" : cat[op.currency_cat];
            let ano = time.getFullYear();
            let dia = time.getDate();
            let hora = time.getHours();
            let minutos = time.getMinutes();
            dia = (dia < 10) ? '0' + dia : dia;
            hora = (hora < 10) ? '0' + hora : hora;
            minutos = (minutos < 10) ? '0' + minutos : minutos;
            let html = '';
            html += '<div id="lot_' + op.id + '" class="operacao" style="display: flex;flex-direction: row;justify-content: space-between;border-top: 1px solid #1c1c1c;padding: 7px 0; align-items: center;">';
            html += '<div style="font-size: 12px; width: 30%; text-align: left;"><p><b>' + hora + ':' + minutos + '</b></p><p style="font-size: 10px;">' + dia + ' ' + months_[time.getMonth()] + '</p></div>';
            html += '<div style="width: 35%; text-align: left;"><div class="item"  style="display: flex;align-items: center;gap: 5px;"><div class="currency_ico"><img width="18px" src="img/ativos/' + op.currency_k + '.png" /></div><div class="currency" style="font-size: 14px"><b>' + op.currency + '</b></div></div><p style="font-size: 12px">' + categoria + '</p></div>';
            html += '<div style="font-size: 12px; text-align: right; width: 35%;"><p style="color: var(--' + cor + ');"><b class="profit"> ' + amountFormat(op.profit) + '</b></p><p style="display: flex;align-items: center;gap: 5px;font-size: 10px; flex-direction: row-reverse;">R$ ' + op.lot + ' <iconify-icon icon="bxs:' + op.trend + '-arrow" style="font-size: 9px;"></iconify-icon></p></div>'
            html += '</div>';

            $("#op_container_close").append(html);


        })
    }

}

// Count and Update lots list
var open_lots_prev = 0;
var close_lots_prev = 0;
function countLots() {
    var count_open_lots = userdata.count_lots_open;
    var count_close_lots = userdata.count_lots_close;
    if (count_open_lots > 0) {
        $('.count_open_lots_menu').removeClass('apagar')
    } else {
        $('.count_open_lots_menu').addClass('apagar')
    }
    if (open_lots_prev != count_open_lots) {
        loadOpenLots();
        open_lots_prev = count_open_lots;
        operacoes();
        $('.count_open_lots_menu').html(count_open_lots);
        $('#count_open_lots').html(count_open_lots);
    }
    if (close_lots_prev != count_close_lots) {
        historico()
        close_lots_prev = count_close_lots;
        $('#count_close_lots').html(count_close_lots);
    }
}





function loadLots(classe, obj) {

    if (classe) {
        $('.top_name').removeClass('selected');
        $(obj).addClass('selected');
    }

    if (classe == "lots_abertos") {
        $('.lots_abertos').removeClass('apagar');
        $('.lots_fechados').addClass('apagar');
    } else {
        $('.lots_fechados').removeClass('apagar');
        $('.lots_abertos').addClass('apagar');
    }
}



function loadOpenLots() {
    $.ajax({
        url: '/traderoom/lots/open',
        type: 'get',
        error: function () {

        },
        success: function (data) {
            $('#lots_open').html(data);

        }
    });
}




function loadCloseLots() {
    $.ajax({
        url: '/traderoom/lots/close',
        type: 'get',
        error: function () {

        },
        success: function (data) {
            $('#lots_close').html(data);
        }
    });
}



function logout() {
    if (userdata.logout == 1) redir('/login');
}




function balance() {
    var b = $('#balance_plugin').html();
    if (userdata.demo == 1) {
        $(".balance_current > .balance_type").html("Conta Demo").removeClass("blue").addClass("blue")
        if(!$(".balance_current.blue").length)$(".balance_current").addClass("blue")
        numAnimate(b, userdata.balance_demo);
    } else {
        $(".balance_current > .balance_type").html("Conta Real")
        if($(".balance_current.blue").length)$(".balance_current.blue").removeClass("blue")
        numAnimate(b, userdata.balance);
    }
    $('#balance_real').html(Number(userdata.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    $('#balance_demo').html(Number(userdata.balance_demo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    
}

function balanceNew() {
    let walletReal = userdata.wallets.find(wallet => wallet.type == 'REAL');
    let walletDemo = userdata.wallets.find(wallet => wallet.type == 'DEMO');


    const inst = instances[0];
    inst.setData({
        active: userdata.demo == 1 ? 'demo' : 'real',
        real: {
            balance: Number(walletReal.balance + walletReal.bonus),
            saldo: Number(walletReal.balance),
            bonus: Number(walletReal.bonus)
        },
        demo: {
            balance: Number(walletDemo.balance)
        }
    }, { animate: true });
    // const accountItemReal = $("#account-item-real");
    // const accountItemDemo = $("#account-item-demo .account-balance");
    // if(accountItemReal && accountItemReal.find(".account-balance").data("balance") != Number(walletReal.balance + walletReal.bonus)){
    //     accountItemReal.find(".account-balance").html(Number(walletReal.balance + walletReal.bonus).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}))
    //     accountItemReal.find(".account-balance").data("balance", Number(walletReal.balance + walletReal.bonus));
    //     if(walletReal.bonus > 0) {
    //         if(accountItemReal.find(".account-details").css('display') != 'block') accountItemReal.find(".account-details").css('display', 'block');
    //         accountItemReal.find(".details-val").html(Number(walletReal.balance).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}))
    //         accountItemReal.find(".bonus-val").html(Number(walletReal.bonus).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}))
    //         accountItemReal.find(".expires-ok").html(new Date(walletReal.bonus_expires_at).toLocaleString());
    //     }else{
    //         if(accountItemReal.find(".account-details").css('display') != 'none') accountItemReal.find(".account-details").css('display', 'none');
    //     }
    // }
    // if(accountItemDemo && accountItemDemo.data("balance") != Number(walletDemo.balance)){
    //     accountItemDemo.html(Number(walletDemo.balance).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}))
    //     accountItemDemo.data("balance", Number(walletDemo.balance));
    // }

}


  function  numAnimate(b1, b2){
    if(this.b2_prev != b2){
        this.b2_prev = b2; 
        $('#balance_plugin').prop('number', b1).animateNumber({
            number: b2,
            numberStep: function(now, tween) {
                var separator = ",";	
                var v = now.toFixed(2);
                $(tween.elem).text(v);
                var parts = v.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
                v = parts.join(".");
                $('#balance').text(v);
                }
        },2000);
    }
} 

function timeEndCounterStartJanela() {
    var op = $("#op_container").find('.operacao');
    for (var i = 0; i < op.length; i++) {
        timeEndCounterJanela(op[i]);

    }
}

function timeEndCounterStart() {
    var lots = $("#lots_open").find('.table_str');
    for (var i = 0; i < lots.length; i++) {
        timeEndCounter(lots[i]);
    }
}


setInterval('timeEndCounterStart()', 10);

setInterval('timeEndCounterStartJanela()', 10);

function timeEndCounter(lot_el) {
    var el = $(lot_el).find('.timer');
    var time_end = Number(el.attr('end')) * 1000 + 999; 
    var time_start = Number(el.attr('start')) * 1000; 
    var now = serverdata.time;
    if (time_end >= 0) {
        var max = time_end - time_start;
        var sec = time_end - now;
        if (now > time_end) sec = sec * 1 + 1000;
        if (sec > max) sec = max;
        if (sec >= 0) {
            var d = secondsToHms(sec);
            el.text(d);

        }
    }
}

function timeEndCounterJanela(lot_el) {
    var el = $(lot_el).find('.timer');
    var time_end = Number(el.attr('end')) * 1000 + 999; 
    var time_start = Number(el.attr('start')) * 1000;
    var clock = el.find('.clock-timer');
    var circle = el.find('.outer-circle');
    var now = timeNow();
    if (time_end >= 0) {
        var max = time_end - time_start;
        var sec = time_end - now;
        if (now > time_end) sec = sec * 1 + 1000;
        if (sec > max) sec = max;
        if (sec >= 0) {
            var d = secondsToHms(sec);
            clock.attr('clock', d);
            var porcentagem = Math.round((100 - (sec / max) * 100)) + '%';
            circle.css('background', 'linear-gradient(var(--bg), var(--bg)) content-box no-repeat, conic-gradient(var(--form-border) ' + porcentagem + ', 0, var(--color1) 100% ) border-box')
        }
    }
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600000);
    var m = Math.floor(d % 3600000 / 60 / 1000);
    var s = Math.floor(d % 3600000 % 60000 / 1000);
    if (m < 10) m = '0' + m;
    if (s < 10) s = '0' + s;
    return m + ":" + s;
}



function timeEndCounters(id) {
    var timer = $('#lot_' + id).find('.timer');
    var time_end = Number(timer.attr('val')) * 1000 + 999; 
    var now = timeNow();
    if (time_end >= 0) {
        var sec = time_end - now;
        if (sec >= 0) {
            var d = secondsToHms(sec);
            timer.text(d);
        }
    }
}

function profitOpenLotsJanela() {
    var lots = userdata.lots_open;
    var currency = serverdata.currency;
    for (var i = 0; i < lots.length; i++) {
        var id = lots[i]['id'];
        var profit = lots[i]['profit'];
        var e = $('#op_container');
        var el = e.find('#lot_' + id).find('.profit');

        el.html('<b>' + amountFormat(profit) + '</b>');

        if (profit <= 0) {
            el.css('color', 'var(--vermelho)');
        } else {

            el.css('color', 'var(--verde)');
        }


    }

}

function profitOpenLots() {
    var lots = userdata.lots_open;
    var currency = serverdata.currency;
    $('.lots_open_profit').hide();
    var profit_all = 0;
    for (var i = 0; i < lots.length; i++) {
        var id = lots[i]['id'];
        var profit = lots[i]['profit'];
        var el = $('#lot_' + id).find('.profit');
        var inicio = lots[i]['course_start'];
        var atual = currency[lots[i]['currency_id']];
        var pagamento = lots[i]['binary_percent_amount'];

        let resultado = (lots[i]['trend'] == 'up') ? (inicio < atual) ? true : false : (inicio > atual) ? true : false;

        if (resultado) {
            el.html(amountFormat(pagamento.toString()))
            el.addClass('profit_up');
            el.removeClass('profit_down');
        } else {
            el.html(amountFormat(profit.toString()));
            el.addClass('profit_down');
            el.removeClass('profit_up');
        }
        profit_all += 1 * profit;


        $('.lots_open_profit').html(amountFormat(profit_all.toFixed(2)));
        $('.lots_open_profit').show();

    }
}


function amountFormat(v) {
    var r = '';
    if (v < 0) {
        var s = v.split('-');
        r = '- R$ ' + s[1];
    }
    if (v > 0) {
        r = '+ R$ ' + v;
    }
    if (v == 0) {
        r = ' R$ ' + v;
    }
    return r;
}




function timeNow() {
    return Date.now();
}




function _menu() {
    sc();

    // $(".slider_menu").fadeToggle();

    if ($(".slider_menu").css('display') == "none") {
        $(".slider_menu").fadeIn();
        // $(".slider_menu").show();
        //$(".bgwindow").show();
    } else {
        $(".slider_menu").fadeOut();
        // $(".slider_menu").hide();
        $(".bgwindow").hide();
    }
}



function chartBodyClick() {
    // $('.popup').hide();
    // $('.chat').hide(); 
    // $(".slider_menu").hide();
    // $('body').find('.iconbar_window').hide();

    $('.popup').fadeOut();
    $('.chat').fadeOut();
    $(".slider_menu").fadeOut();
    $('body').find('.iconbar_window').fadeOut();

}


function addDemo() {
    sc();
    $.ajax({
        url: '/traderoom/balance/add_demo',
        type: 'get',
        success: function (response) { }
    });
}


function getCurrencyList(obj, category, soundclick = 1) {
    if (soundclick == 1) sc();

    if (obj) {
        $('.item').removeClass('selected');
        $(obj).addClass('selected');
    }

    $.ajax({
        url: '/traderoom/currency/' + category,
        type: 'get',
        success: function (response) {
            $(obj).parent().parent().find('.currency').html(response);
        }
    });
}


function getCurrencyListDef(category) {

    $.ajax({
        url: '/traderoom/currency/' + category,
        type: 'get',
        success: function (response) {
            $('.curreny_table').find('.currency').html(response);
        }
    });
}




var window_id = 0;

function addTab() {
    $('.popup').fadeToggle();
    $('.popup').hide();
    window_id = 0;
    openblock('add_tab', '60px', '50%');
}




function setCurrency(id) {

    //console.log('jhow');

    // Borda no ativo aberto
    const inputs = document.querySelectorAll('.ativoAbertoBorda');

    inputs.forEach(input => {
        const rotateDiv = input.closest('.rotate');
        if (rotateDiv) {
            rotateDiv.style.border = 'none';
        }
    });

    inputs.forEach(input => {
        if (parseInt(input.value) === id) {
            const rotateDiv = input.closest('.rotate');
            if (rotateDiv) {
                rotateDiv.style.border = '1px solid var(--verde)';
                rotateDiv.style.borderBottom  = '3px solid var(--verde)';
            }
        }
    });

    if (window_id == 0) {
        w1.setCurrency(id);
        saveWindow(1, id);
        saveTab(id);
    }

    if (window_id > 0) {
        var classname = "w" + window_id;
        if (window[classname] != undefined) {
            window[classname].setCurrency(id);
            saveWindow(window_id, id);
        }
    }

    closeblock();
}






// type == 0;
function setWindowType(type) {
    //sc();
    $('#w1').css('z-index', '2');
    if (type == 0) {




        $('#w1').animate({ "width": "100%" }, 400);
        $('#w2').css('left', '0');
        // $('#w1').css('width','100%');
        $('#w2').css('width', '100%');


    }

    if (type == 1) {




        $('#w1').css('left', '0');
        $('#w2').css('left', '50%');
        $('#w1').animate({ "width": "50%" }, 400);
        // $('#w1').css('width','50%');
        $('#w2').css('width', '50%');

    }


    $.ajax({
        url: '/traderoom/save/window/' + type,
        type: 'get',
        success: function (response) {
            // location.reload();
        }
    });

    closeblock();
}




var count_tabs = 0;

function tabs_list() {
    $.ajax({
        url: '/traderoom/tabs/list',
        type: 'get',
        success: function (response) {
            if (response) {

                //console.log(response.length);

                $('#tabs').html(response);
                tabs_width();
            }
        }
    });
}

tabs_list();




function saveTab(currency_id) {
    $.ajax({
        url: '/traderoom/tabs/add/' + currency_id,
        type: 'get',
        success: function (response) {
            tabs_list();
        }
    });
}

var lock_opentab = 0;

function delTab(currency_id) {
    sc();
    lock_opentab = 1;
    $.ajax({
        url: '/traderoom/tabs/del/' + currency_id,
        type: 'get',
        error: function () {
            lock_opentab = 0;
        },
        success: function (response) {
            tabs_list();
            lock_opentab = 0;
        }
    });
}


function openTab(currency_id) {

    //console.log('jhow');

    // Borda no ativo aberto
    const inputs = document.querySelectorAll('.ativoAbertoBorda');

    inputs.forEach(input => {
        const rotateDiv = input.closest('.rotate');
        if (rotateDiv) {
            rotateDiv.style.border = 'none';
        }
    });

    inputs.forEach(input => {
        if (parseInt(input.value) === currency_id) {
            const rotateDiv = input.closest('.rotate');
            if (rotateDiv) {
                rotateDiv.style.border = '1px solid var(--verde)';
                rotateDiv.style.borderBottom  = '3px solid var(--verde)';
            }
        }
    });

    if (lock_opentab == 1) return false;
    $('#page').hide();
    w1.setCurrency(currency_id);
    saveWindow(1, currency_id);
    sc();
}



function map(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}


function tabs_width() {
    $('.add_tab').show();
    var all = $('.tabs .tab').length;

    if (all >= 10) $('.add_tab').hide();
    var s = $('.head_left').width();
    var r = $('.head_right').width();

    var w = $(window).width();

    $('.tabs .tab').eq(0).css('margin-left', '10px');

    if (w < 1200) return false;

    var t = w - (s + r) - 10;
    $('.tabs').css('width', t + 'px');

    // range map  1200px 1900px  =>  -80px  -5px
    // var v = map(w, 1200, 2000, -80, -5);
    // $('.tabs .tab').css('margin-left', v + 'px');
    // $('.tabs .tab').eq(0).css('margin-left', '10px');
}




var months = new Array('Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro');
var months_ = new Array('Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez');

function getDateTime() {
    var now = new Date(serverdata.time);
    var year = now.getFullYear();
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    if (day.toString().length == 1) {
        day = '0' + day;
    }
    if (hour.toString().length == 1) {
        hour = '0' + hour;
    }
    if (minute.toString().length == 1) {
        minute = '0' + minute;
    }
    if (second.toString().length == 1) {
        second = '0' + second;
    }

    var n = now.getMonth();
    var m = months[n];


    var dateTime = day + ' ' + m + ' ' + hour + ':' + minute + ':' + second;
    return dateTime;
}
setInterval(function () {
    currentTime = getDateTime();
    $('.time').html(currentTime);
}, 50);

var audioclick = 0;

function playSound(src) {
    if (sound_status == 0) return false;
    var audio = new Audio(src);
    audio.play();
}


function sc() {
    playSound("sounds/click.mp3");
    audioclick = 1;
}



function openblock(name, top, left) {
    sc();
    $("#" + name).css('top', top);
    $("#" + name).css('left', left);

    if (left == "50%") {
        var w = $("#" + name).width();
        w = w / 2;
        $("#" + name).css('margin-left', "-" + w + "px");
    } else {
        $("#" + name).css('margin-left', 0);
    }
    if ($("#" + name).css('display') == "none") {
        $("#" + name).show();
        //$(".bgwindow").show();
    } else {
        $("#" + name).hide();
        //$(".bgwindow").hide();
    }
}



function closeblock() {
    $(".bgwindow").fadeOut();
    $(".popup").fadeOut();
}



function addFav(id) {
    sc();
    $.ajax({
        url: '/traderoom/currency/fav_add/' + id,
        type: 'get',
        success: function (response) {

            if (response == 'del') {
                $('#fav' + id).removeClass('active');
            }
            if (response == 'add') {
                $('#fav' + id).addClass('active');
            }
        }
    });
}


function saveWindow(num, currency_id) {
    $.ajax({
        url: '/traderoom/save/w' + num + '/' + currency_id,
        type: 'get',
        success: function (response) { }
    });
}




function redir(url) {
    document.location.href = url;

}


function selects() {
    $('.select2 select').bind('change', function () {
        var val = $(this).children(':selected').text();
        $(this).parent().find('.value').html(val);
    });
    var selected = $('.select2 option:selected');
    for (var j = 0; j < selected.length; j++) {
        if (selected[j]) {
            var val = $(selected[j]).text();
            $(selected[j]).parent().parent().find('.value').html(val);
        }
    }
}





function sound() {
    if (sound_status == 1) {
        $('.sound').addClass('off');
        sound_status = 0;
    } else {
        $('.sound').removeClass('off');
        sound_status = 1;
        sc();
    }
    savesound(sound_status);
}


function savesound(status) {
    $.ajax({
        url: '/traderoom/save/sound/' + status,
        type: 'get',
        success: function (response) { }
    });
}




function setCurrencyW2(id) {
    var classname = "w2";
    if (window[classname] != undefined) {
        window[classname].setCurrency(id);
        saveWindow(2, id);
        setWindowType(1);
    }
}





function isMobile() {
    var w = $(window).width();
    if (w < 800 && w > 0) return true;
    return false;
}



function windowH() {
    if (window.innerHeight) {
        return window.innerHeight;
    } else {
        return document.body.clientHeight;
    }
}




function select_click(obj) {
    sc();
    if ($(obj).parent().find('.selects_list').css('display') == "block") {
        // $(obj).parent().find('.selects_list').hide();
        $(obj).parent().find('.selects_list').fadeOut();
    } else {
        // $(obj).parent().find('.selects_list').show();
        $(obj).parent().find('.selects_list').fadeIn();
    }
}




function FullScreen() {
    sc();
    var elem = document.body;
    if ((document.fullScreenElement !== undefined && document.fullScreenElement === null) || (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) || (document.mozFullScreen !== undefined && !document.mozFullScreen) || (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)) {
        if (elem.requestFullScreen) {
            elem.requestFullScreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullScreen) {
            elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}


function addlotResize(h) {
    if (h < 600) {
        $('.right .name').hide();
        $('.right .help').hide();
    } else {
        $('.right .name').show();
        $('.right .help').show();
    }
}

function openChat() {
    sc();
    $(".slider_menu").hide();
    if ($('.chat').css('display') == 'none') {
        $('.chat').show();
    } else {
        $('.chat').hide();
    }
}


function openChats() {
    sc();
    $(".slider_menu").hide();
    if ($('.chats').css('display') == 'none') {
        $('.chats').show();
    } else {
        $('.chats').hide();
    }
}



function datapost(element) {
    var data = '';
    var form = $(element).find('select');
    for (var i = 0; i < form.length; i++) {
        data += form[i]['name'] + '=' + form[i]['value'] + '&';
    }
    var form = $(element).find('input');
    for (var i = 0; i < form.length; i++) {
        if ($(form[i]).attr('type') == 'checkbox') {
            if ($(form[i]).prop('checked')) {
                data += form[i]['name'] + '=' + form[i]['value'] + '&';
            } else {
                data += form[i]['name'] + '=&';
            }
        } else {
            data += form[i]['name'] + '=' + form[i]['value'] + '&';
        }
    }
    return data;
}


function mess(text) {
    $('.mess').html(text);
    $('.mess').css('display', 'table');
    $('.mess').removeClass('ok');
}

function mess2(text) {
    $('.mess2').html(text);
    $('.mess2').css('display', 'table');
    $('.mess2').removeClass('ok');
}

function messOk(text) {
    $('.mess').html(text);
    $('.mess').css('display', 'table');
    $('.mess').addClass('ok');
}

function mess2Ok(text) {
    $('.mess2').html(text);
    $('.mess2').css('display', 'table');
    $('.mess2').addClass('ok');
}


function _switch() {
    $(".switch").each(function () {
        var st = $(this).find('input').val();
        if (st == 1) {
            $(this).css('background-color', '#318ED2');
            $(this).find('.c').css('margin-left', '24px');
        }
    });
    $(".switch").on("click", function () {
        var st = $(this).find('input').val();
        if (st == 1) {
            $(this).find('input').val('0');
            $(this).css('background-color', '#3E4664');
            $(this).find('.c').css('margin-left', '4px');
        } else {
            $(this).find('input').val('1');
            $(this).css('background-color', '#318ED2');
            $(this).find('.c').css('margin-left', '24px');
        }
        sc();
    });
}




$(window).resize(function () {
    tabs_width();
    if (isMobile()) redir('/mob');
});


$(document).ready(function () {


    if (isMobile()) redir('/mob');

    _switch();

    document.oncontextmenu = function () { return false; };

    // tabs right click event
    $(document).mousedown(function (e) {
        if (e.button == 2) {
            var et = $(e.target);
            var w2id = et.find('.right_click').val();
            // if(!w2id) w2id =  et.parent().parent().find('.right_click').val(); 
            if (w2id > 0) setCurrencyW2(w2id);
            return false;
        }
        return true;
    });



    $('.bodyclick').click(function (event) {
        event.stopPropagation();

    });

    $('body').click(function () {

        $(".bodyclick_hide").fadeOut();
        $(".selects_list").fadeOut();
        $('.chat').fadeOut();

    });


    $('.selects_label').click(function (event) {
        event.stopPropagation();
    });

    tabs_list();


    selects();

    getCurrencyListDef('open');

    $('input').attr('autocomplete', 'off');


    // Ao clicar no botão, abre o input file oculto
    $("#page").on("click", '#uploadButton', function () {
        $('#documentos').click();
    });

    $("#page").on("click",'#EnviarRevisao', function () {
        // Faz o upload via AJAX
        $.ajax({
            url: 'traderoom/profile/documentos/revisar',
            type: 'POST',
            success: function () {
                openPage('/traderoom/profile');
            },
        });
    })

    // Quando os arquivos são selecionados, inicia o upload
    $("#page").on('change', '#documentos', function () {

        const files = this.files;

        if (files.length === 0) {
            alert('Nenhum arquivo selecionado.');
            return;
        }

        const formData = new FormData();
        for (const file of files) {
            formData.append('documents[]', file);
        }


        // Faz o upload via AJAX
        $.ajax({
            url: 'traderoom/profile/documentos/enviar',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'json',
            success: function () {

                // Atualiza a lista de arquivos
                updateFileList();

                // Reseta o estado
                $('#documentos').val('');
            },
            error: function (xhr) {
                alert('Erro no upload: ' + xhr.responseText);
            }
        });
    });
    
    $("#page").on('click', '#listaDocumentos .item-action', function () {
        let id = $(this).data('id');
        $.ajax({
            url: 'traderoom/profile/documentos/excluir',
            type: 'POST',
            data: {id: id},
            success: function () {
                // Atualiza a lista de arquivos
                updateFileList();
            },
            error: function (xhr) {
                alert('Erro ao Deletar Arquivo');
            }
        });
    });
    let lista = setInterval(function() {
        if($('#listaDocumentos')){
            updateFileList();
            clearInterval(lista);
        }
    }, 1000)
});


// Atualiza a lista de arquivos
function updateFileList() {
    
    $.get('traderoom/profile/documentos/lista', function (data) {
        if(data.length == 0) {
            $('#EnviarRevisao').prop('disabled', true);
        }else{
            $('#EnviarRevisao').prop('disabled', false);
        }
        if(data.length >= 2){
            $('#uploadButton').hide();
        }else{
            $('#uploadButton').show();
        }
        if(data.length > 0){
            let html = "<ul class='list-group'>";
            html += "Seus documentos enviados:";
            let icon = '<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m13.125 6.942-5.133 5.133c-1.459 1.458-3.909 1.458-5.367 0-1.458-1.458-1.458-3.908 0-5.367l4.55-4.55a2.606 2.606 0 0 1 3.733 0 2.606 2.606 0 0 1 0 3.734l-4.2 4.141c-.583.584-1.516.584-2.041 0-.584-.583-.584-1.516 0-2.041l3.5-3.5" stroke="var(--icon-color,#A1A1B3)" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
            let iconDel = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.333 3.758h13.334M6.182 3.758V1.333h3.636v2.425M12.243 6.182v7.273a1.212 1.212 0 0 1-1.213 1.212H4.97a1.212 1.212 0 0 1-1.212-1.212V6.182" stroke="var(--icon-color, #FF4D4D)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
            data.forEach(arquivo => {
                html += `<li id="documento-${arquivo.id}" class='list-group-item'><span class="item-icon">${icon}</span><span class="item-name">${arquivo.filename}</span><button data-id="${arquivo.id}" class="item-action">${iconDel}</span></li>`;
            });
            html += "</ul>";
            $('#listaDocumentos').html(html);
        }else{
            $('#listaDocumentos').html("<ul class='list-group'><p style='text-align: center;'>Nenhum arquivo enviado ainda.</p></ul>");
        }
    });
}


var copyBusca_prev = '';
function copySearchUser(page, val) {
    // console.log(val);
    // console.log(payout_prev);

    $.ajax({
        url: '/traderoom/copy/filtro',
        type: 'post',
        data: { 'page': page, 'q': val },
        error: function () {
        },
        success: function (data) {
            // if(copyBusca_prev != data){
            //     copyBusca_prev = data;
            $('#listCopyUsers').html(data);
            // }
        }
    });

}