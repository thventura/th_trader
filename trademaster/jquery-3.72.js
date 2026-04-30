
var lang = 'en';
var sound_status = 1;
var serverdata = {};
var userdata = {}
var isSocketOpen = false;
var intentionalClosure = false;

class Terminal {
  constructor(
    id,
    set_currency,
    lang,
    timezone,
    mob,
    chart_type,
    resolution_,
    timeInicial,
    restapi,
    wsurl,
    nodeurl,
    restapi_otc,
    wsurl_otc
  ) {
    let times = { 60: 0, 300: 1, 900: 2 };
    this.timepos = 0;
    this.resolution = resolution_;
    this.restapi = restapi;
    this.wsurl = wsurl;
    this.nodeurl = nodeurl;
    this.restapi_otc = restapi_otc;
    this.wsurl_otc = wsurl_otc;

    this.id = id;
    this.obj = $("#w" + id);
    this.lang = lang;
    this.mob = mob;
    this.chart_type = chart_type;
    this.socket;
    this.dataloaded = 0;
    this.timezone = timezone;
    this.set_currency = set_currency;
    this.currencyDef();
    this.time = new Date();

    this.currencySelectClick();
    this.addLotClick();
    this.inputPlusMinus();
    this.binaryTimesPlusMinus();
    this.binaryAmountChange();

    this.lots_obj = [];
    this.lots_forex_obj = [];
    this.lots_open = [];
    this.lots_close = [];

    this.timeopen = new Timeopen(this.widget, this.obj);
    this.alertaID;
    this.socketTabId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    this.isSocketOpen = false;
    this.connectSocket(); // Conectar ao socket ao instanciar a classe
    this.diffTime = 0;
  }


  getCookie(k) {
    var cookies = " " + document.cookie;
    var key = " " + k + "=";
    var start = cookies.indexOf(key);

    if (start === -1) return null;

    var pos = start + key.length;
    var last = cookies.indexOf(";", pos);

    if (last !== -1) return cookies.substring(pos, last);

    return cookies.substring(pos);
  }
  connectSocket() {

    // Configurar a conexão com o Socket.IO
    const socket = io(this.nodeurl, {
      transports: ['websocket'],
      auth: (cb) => {
        cb({
          cookie: this.getCookie('authentication')
        })
      },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Tenta reconectar indefinidamente
      reconnectionDelay: 3000, // 3 segundos de intervalo entre as tentativas
    });

    socket.on("connect", () => {
      // Enviar o userId após a conexão
      setTimeout(() => {
        socket.emit("get_serverdata", { action: "get_serverdata" });
      }, 50);
    });

    // Receber os dados do userdata e atualizar o estado
    socket.on("userdata_result", (data) => {
      this.updateUserData(data); // Atualiza o estado do terminal com os dados recebidos
      // console.log("[DEBUG] Dados de `userdata` atualizados:", data);
    });

    // Receber os dados do serverdata e atualizar o estado
    socket.on("serverdata_result", (data) => {
      this.updateServerData(data); // Atualiza o estado do terminal com os dados recebidos
      // console.log("[DEBUG] Dados de `serverdata` atualizados:", data);
    });

    const start = Date.now();
    socket.emit('ping_server', { start });

    socket.on('pong_server', ({ start, serverTime }) => {
      const roundTrip = Date.now() - start;
      const offset = (Date.now() - serverTime) - roundTrip / 2;
      console.log('Offset estimado:', offset, 'ms');
      const clientTime = Date.now();
      const diff = clientTime - serverTime; // diferença em milissegundos
      console.log('Diferença cliente-servidor:', diff, 'ms');
      this.diffTime = offset;
    });

    setInterval(() => {
      const start = Date.now();
      socket.emit('ping_server', { start });
    }, 60 * 1000); // a cada 1 minuto
    // Receber resposta do servidor
    socket.on("add_lot_result", (data) => {
      this.blocked = 0;
      const b = this.obj.find(".addlot_binary .mess_lot");
      if (data.status === "ok") {
        this.addChartBinaryLot(data.lot);
        // $(b).fadeTo(500, 0);
        $(b).fadeOut();
      } else {
        $(b).fadeTo(500, 1);
        b.html(data.status);
        setTimeout(() => {
          // $(b).fadeTo(500, 0);
          $(b).fadeOut();
        }, 2500);
      }
    });

    socket.on("alertAPP", (data) => {
      let result = {
        type: "OPERATION_RESULT",
        success: true,
        operation_id: data.id,
        pnl: Number(data.profit)
      };
      window.top.postMessage(result, '*');
    });

    // Receber alertas do servidor
    socket.on("alert_result", (data) => {
      this.Alerta(data);
    });

    socket.on("serverdata_error", (error) => {
      //console.error("[ERROR] Erro ao receber serverdata:", error.message);
    });
    
    // Evento disparado quando o cliente se desconecta
    socket.on('disconnect', (reason) => {
      console.log("Desconectado do servidor. Motivo:", reason);
    });

    // Evento para monitorar tentativas de reconexão
    socket.on('reconnect_attempt', (attempt) => {
      console.log("Tentando reconectar, tentativa número:", attempt);
    });

    // Evento disparado quando a reconexão ocorre com sucesso
    socket.on('reconnect', (attemptNumber) => {
      console.log("Reconectado com sucesso na tentativa:", attemptNumber);
    });

    socket.on("error", (error) => {
      console.error("Erro no Socket.IO:", error);
    });

    this.socket = socket;
  }

  
  updateUserData(data) {
    if(!data.time) return
    userdata = data;

    if(data.reload) location.reload();
    logout();
    this.lotsCurrency(data.lots_open);
    this.lotsCurrency2(data.lots_close);
    if(data.rollover > 0 && data.rollover_total){
      $("#rolloverButton").removeClass("hidden");
      let progressbarRollover = ((data.rollover_total - data.rollover) / data.rollover_total) * 100
      $("#rollover_bonus").html(data.bonus.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
      $("#rollover_restante").html(data.rollover.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
      $("#rollover_q_meta").html(Number(data.rollover_total - data.rollover).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
      $("#rollover_meta").html(Number(data.rollover_total).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
      $("#expiracao_bonus").html(new Date(data.bonus_expires_at).toLocaleString());
      $(".rollover_progressbar > div").css('width', `${progressbarRollover}%`);
    }else{
      $("#rolloverButton").addClass("hidden");
    }
    let walletReal = data.wallets.find(wallet => wallet.type == 'REAL');
    let walletDemo = data.wallets.find(wallet => wallet.type == 'DEMO');

    const inst = instances[0];
    inst.setData({
        active: data.demo == 1 ? 'demo' : 'real',
        real: {
            balance: Number(walletReal.balance + walletReal.bonus),
            saldo: Number(walletReal.balance),
            bonus: Number(walletReal.bonus)
        },
        demo: {
            balance: Number(walletDemo.balance)
        }
    }, { animate: true });
    if (this.dataloaded == 1) {

      

      this.lotsForexclosed();
      this.lotsBinaryclosed();
      this.activeLots();
      this.addVerticalLine();
      countLots();
      balance();
      // alerts();
      logout();
      profitOpenLots();
    }

    //this.lineIndicator();
  };

  updateServerData(data) {
    if(!data.time) return
    // Esta função substitui o antigo `serverData()` e atualiza o estado com os dados recebidos
    
    
    this.server = data;
    serverdata = data;
    if(data.reload) location.reload();

    if (this.dataloaded == 1) {

      binaryTime();
      binaryTimeList()
    }
  }

  convertTimeResolution(current_timebet) {
    var resolution = this.widget.activeChart().resolution();

    var _difference;
    var new_time;
    // t_timebet = new_time.getTime() / 1000;
    if (resolution == "1") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      current_timebet = new_time.getTime();
    } else if (resolution == "2") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 2;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "3") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 3;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "4") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 4;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "5") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 5;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "10") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 10;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "15") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 15;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "30") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      _difference = new_time.getMinutes() % 30;
      new_time.setMinutes(new_time.getMinutes() - _difference);
      current_timebet = new_time.getTime();
    } else if (resolution == "60") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      new_time.setMinutes(0);
      current_timebet = new_time.getTime();
    } else if (resolution == "120") {
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      new_time.setMinutes(0);
      current_timebet = new_time.getTime();
    }else if (resolution == "240"){
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      new_time.setMinutes(0);
      current_timebet = new_time.getTime();
    } else if (resolution == "1440"){
      current_timebet = current_timebet;
      new_time = new Date(current_timebet);
      new_time.setSeconds(0);
      new_time.setMinutes(0);
      current_timebet = new_time.getTime();
    }
    return current_timebet;
  }

  addVerticalLine() {
    if (this.line) {
      this.widget.activeChart().removeEntity(this.line);
      this.line = 0;
    }

    var sec = parseInt(this.obj.find('input[name="binarytime"]').val());

    if (sec > 0 && this.server.time > 0) {
      var timeline = this.server.time * 1 + (sec * 1000);

      timeline = this.convertTimeResolution(this.server.relogios[sec]);
      // Diferença em milissegundos
      let diffMs = this.server.relogios[sec] - this.server.time;

      // Converter para segundos e milissegundos
      let totalSeg = Math.floor(diffMs / 1000);
      let hour = Math.floor(totalSeg / 60 / 60);
      let minutos = Math.floor(totalSeg / 60 % 60);
      let segundos = totalSeg % 60;

      this.line = this.widget.chart().createShape(
        { time: Math.floor(timeline / 1000), price: 0 },
        {
          shape: "vertical_line",
          lock: true,
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
          zOrder: "top",
          overrides: {
            linecolor: "#576581",
            linestyle: 1,
            showTime: false,
            showLabel: true,
            fontsize: 16,
            text: `Encerramento\n${String(hour).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`,
            textcolor: "#fff",
            textOrientation: "horizontal",
            horzLabelsAlign: "center",
            vertLabelsAlign: "bottom"
          },
        }
      );
    }
  }

  lineIndicator() {
    var v = this.server.indicator_up;
    var b = this.obj.find(".indicator_line");
    if (this.indicator_prev == v) return false;
    this.indicator_prev = v;
    v = v * 5;
    $(b).animate({ "background-position-y": "-" + v + "px" }, 1000);
  }

  lotsCurrency(lots) {
    this.lots_open = new Array();
    if(!this.currency) return
    for (var i = 0; i < lots.length; i++) {
      var currency_id = lots[i]["currency_id"];
      if (currency_id == this.currency.id) {
        this.lots_open.push(lots[i]);
        //console.log(lots[i]['id']);
      }
    }
  }

  lotsCurrency2(lots) {
    this.lots_close = new Array();
    if(!this.currency) return
    for (var i = 0; i < lots.length; i++) {
      var currency_id = lots[i]["currency_id"];
      if (currency_id == this.currency.id) {
        this.lots_close.push(lots[i]);
        //console.log(lots[i]['id']);
      }
    }
  }

  Alerta(alerta) {
    var m = alerta;

    if (m && this.alertaID != m.id) {
      this.alertaID = m.id;

      var html2;
      var html;
      
      this.socket.emit("alertaFinalizado", {
        id: m.id
      });

      if (m.profit > 0) {
          html2 = '<div class="n2" style="color: #fff;"><b>R$ ' + m.profit + '</b></div>';
          html = '<div class="alertmessage id-' + m.id + '" style="background: var(--verde);">';
          playSound("sounds/win.mp3");
      } else {
          html2 = '<div class="n2" style="color: #fff;"><b>R$ ' + m.profit + '</b></div>';
          html = '<div class="alertmessage id-' + m.id + '" style="background: var(--vermelho);">';
          playSound("sounds/loss.mp3");
      }
      html += '<img   class="icon"   src="img/ativos/' + m.currency_k + '.png" alt="">';
      html += '<div class="profitinfo">';
      html += '<div  class="n1">' + m.currency_name + '</div>';
      html += '<div class="clear"></div>';
      html += html2;
      html += ' <div class="clear"></div>';
      html += ' </div> <div class="clear"></div> </div>';
      $('.main').append(html);

      setTimeout(function () {
          $('.id-' + m.id).animate({
              left: '-1500px'
          }, 5000, function () {
              $('.id-' + m.id).remove();

          });
      }, 6000);
    }
  }

  currencyIcon() {
    var d = this.obj.find(".currency_select");
    d.find(".namev").html(this.currency.name);
    d.find(".icon").attr("src", this.currency.ico);
    d.find(".type").html(this.currency.category_name);

    var z = this.obj.find('.currency_select_novo');
    z.find('.namev').html(this.currency.name);
    z.find('.icon').attr('src', this.currency.ico);
    z.find('.type').html(this.currency.category_name);

    if (this.mob == 1) {
      if (this.currency.forex == 1) {
        this.obj.find(".iconbar .fx").html("FX");
      } else {
        this.obj.find(".iconbar .fx").html("BO");
      }
    }


    setTimeout(() => {

      const inputs = document.querySelectorAll('.ativoAbertoBorda');

      inputs.forEach(input => {


        if (input.value === this.currency.id) {

          const rotateDiv = input.closest('.rotate');

          if (rotateDiv) {
            rotateDiv.style.border = '1px solid var(--verde)';
            rotateDiv.style.borderBottom  = '3px solid var(--verde)';
          }
        }

      });

    }, 5000);
  }

  removeAllLinesChart() {
    for (var i = 0; i < this.lots_obj.length; i++) {
      var obj1 = this.lots_obj[i][2];
      var obj2 = this.lots_obj[i][3];
      if (obj1) this.widget.activeChart().removeEntity(obj1);
      if (obj2) obj2.remove();
    }
    for (var i = 0; i < this.lots_forex_obj.length; i++) {
      var obj1 = this.lots_forex_obj[i][1];
      var obj2 = this.lots_forex_obj[i][2];
      var obj3 = this.lots_forex_obj[i][3];
      if (obj1) obj1.remove();
      if (obj2) obj2.remove();
      if (obj3) obj3.remove();
    }
    this.lots_obj = new Array();
    this.lots_forex_obj = new Array();
  }

  setCurrency(set_currency) {
    this.lots_open = new Array();
    this.lots_close = new Array();
    this.lots_load = 0;
    this.removeAllLinesChart();

    $(".mess_lot").hide();
    
    $.ajax({

      url: "/traderoom/currency/info/"+set_currency,
      type: "post",
      data: { json: 1, currency_id: set_currency },
      dataType: "json",
      error: function () { }.bind(this),
      success: function (currency) {


        // - > eu quero que aqui ele da um widget.remove  
        this.widget.activeChart().resetData();
        this.reinitializeChart(currency.k);




        this.widget
          .activeChart()
          .setVisibleRange(
            { from: this.timeNow(serverdata.time) - 1800, to: this.timeNow(serverdata.time) },
            { percentRightMargin: 10 }
          );

        this.currency = currency;
        this.timeopen.setList(currency.timeopen);
        this.currencyIcon();
        this.lotBlockShow();
      }.bind(this),
    });
  }

  reinitializeChart(symbol) {

      // Define o novo símbolo no gráfico
      this.widget.activeChart().setSymbol(symbol);

      // // Configura o intervalo de tempo e a resolução
      // this.widget.activeChart().setVisibleRange(
      //   { from: this.timeNow(serverdata.time) - 1800, to: this.timeNow(serverdata.time) },
      //   { percentRightMargin: 10 }
      // );

      this.widget.activeChart().setResolution(this.resolution);
      this.chartResolution(this.resolution);
      this.widget.activeChart().executeActionById("chartReset");
      // Recarrega os dados
      this.widget.activeChart().resetData();

      // Reconecta o WebSocket e subscreve o novo símbolo
      //this.dataPulseProvider.reinitializeSocket(symbol, this.resolution);

  }


  currencyDef() {
    $.ajax({
      url: "/traderoom/currency/info/"+this.set_currency,
      type: "post",
      data: { json: 1, currency_id: this.set_currency },
      dataType: "json",
      error: function () {
        setTimeout(
          function () {
            this.currencyDef();
          }.bind(this),
          3000
        );
      }.bind(this),
      success: function (currency) {
        this.currency = currency;
        this.timeopen.setList(currency.timeopen);
        this.currencyIcon();
        this.lotBlockShow();
        this.initChart(currency.k, currency.category);
      }.bind(this),
    });
  }

  currencySelectClick() {
    this.obj.find(".currency_select").bind(
      "click",
      function () {
        sc();
        window_id = this.id;

        if (this.obj.find(".curreny_table").css("display") == "none") {
          $(".popup").hide();
          this.obj.find(".curreny_table").show();
        } else {
          this.obj.find(".curreny_table").hide();
        }

        this.obj.find(".curreny_table").css("left", 0);
        this.obj.find(".curreny_table").css("top", 50 + "px");
        this.obj.find(".curreny_table").css("width", 900 + "px");
      }.bind(this)
    );
  }

  lotBlockShow() {

    this.obj.find(".addlot_binary").show();

    if (this.mob == 1) {
      this.binaryTimesListMob();
    } else {
      this.binaryTimesList();
    }

    this.binaryProfitPercent();
    // }
  }

  binaryProfitPercent() {
    this.binarypercent = vip ? this.currency.profitvip : this.currency.profit;
    this.obj.find(".percent").html("+" + this.binarypercent + "%");
    this.binaryProfitLot();
  }

  binaryAmountChange() {
    var b = this.obj.find(".addlot_binary");
    b.find('input[name="lot_amount"]').on(
      "keyup",
      function () {
        this.binaryProfitLot();
      }.bind(this)
    );

    this.obj.find(".amount_plus").bind(
      "click",
      function () {
        this.binaryProfitLot();
      }.bind(this)
    );
    this.obj.find(".amount_minus").bind(
      "click",
      function () {
        this.binaryProfitLot();
      }.bind(this)
    );
  }

  binaryProfitLot() {
    var b = this.obj.find(".addlot_binary");
    var lot = b.find('input[name="lot_amount"]').val();
    //  var profit = lot * 1 +  (lot*this.binarypercent/100);
    var profit = (lot * this.binarypercent) / 100;
    //  profit = profit.toFixed(2);
    b.find(".lot_profit").html(
      profit.toLocaleString("pt-br", { minimumFractionDigits: 2 })
    );
  }

  binaryTimesList() {
    var b = this.obj.find(".addlot_binary").find(".binarytimes_list");
    //var arr = this.currency.binarytime.split(",");
    var arr = [60, 120, 180, 240, 300, 600, 900, 1800, 3600];
    var items = "";
    for (var i = 0; i < arr.length; i++) {
      // items += '<div value="'+arr[i]+'" class="item">'+this.tFormat(arr[i])+'</div>';
      let style = i == arr.length - 1 ? ' style="grid-column: 1 / -1;" ' : '';
      let hour = Math.floor(arr[i] / 60 / 60);
      let minute = arr[i] / 60 % 60;
      items += `<div value="${arr[i]}" class="item" ${style}>
        <div>
        <p class="tempo_binario" style="color: #fff;font-size: 15px;">${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}</p>
        </div>
        </div>`;
    }
    this.timepos_max = arr.length - 1;
    b.html(items);
    this.binaryTimesClick(b);
    // this.binaryTimesDef(0);
  }

  binaryTimesListMob() {
    var b = this.obj.find(".addlot_binary").find(".binarytimes_list");
    //var arr = this.currency.binarytime.split(",");
    var arr = [60, 120, 180, 240, 300, 600, 900, 1800, 3600];
    var items = "";
    for (var i = 0; i < arr.length; i++) {
      //items += '<div value="'+arr[i]+'" class="item">'+this.tFormat(arr[i])+'</div>';

      items +=
        '<div value="' +
        arr[i] +
        '" class="item"><iconify-icon icon="flowbite:clock-outline" style="padding-top: 3px;color: #fff;font-size: 15px;"></iconify-icon><div><p class="tempo_binario" style="color: #fff;font-size: 15px;">00:00</p><p class="tempo_restante">00:00</p></div><span style="font-size: 12px;padding-top: 2px;">' +
        this.tFormat(arr[i]) +
        "</span></div>";
    }
    items += "";
    this.timepos_max = arr.length - 1;
    b.html(items);
    formlistItemClick();
    // this.binaryTimesDef(0);
  }

  tFormat(v) {
    if (v < 60) v = v + " sec";
    if (v >= 60 && v < 3600) v = v / 60 + "M";
    if (v >= 3600 && v < 86400) v = v / 60 / 60 + " hour";
    if (v <= 86400) v = v / 60 / 60 / 24 + " day";
    return v;
  }

  binaryTimesClick(obj) {
    var cl = this;
    obj.find(".item").bind("click", function () {
      cl.timepos = $(this).index();
      var n = $(this).text();
      var v = $(this).attr("value");
      var b = $(this).parent().parent().parent();
      b.find(".selects_text").html("00:00");
      b.find('input[name="binarytime"]').val(v);

      $.ajax({
        url: "/traderoom/chart_save",
        type: "post",
        data: { time: v },
        dataType: "json",
        error: function () { },
        success: function (status) {
          console.log(status);
          if (status == "ok") {
            console.log(v);
          }
        },
      });
    });
  }

  binaryTimesDef(pos) {
    // console.log(pos);
    this.timepos = pos;
    var obj = this.obj.find(".addlot_binary").find(".binarytimes_list");
    var n = obj.find(".item").eq(pos).text();
    var v = obj.find(".item").eq(pos).attr("value");
    var b = obj.parent().parent();
    b.find(".selects_text").html("00:00");
    b.find('input[name="binarytime"]').val(v);

    $.ajax({
      url: "/traderoom/chart_save",
      type: "post",
      data: { time: v },
      dataType: "json",
      error: function () { },
      success: function (status) {
        if (status == "ok") {
        }
      },
    });
  }

  // leverageList(){
  // 	var b  = this.obj.find('.addlot_forex').find('.leverage_list');

  // 	var arr = this.currency.leverage.split(",");
  // 	var items = '';
  // 	for (var i = 0; i < arr.length; i++) {
  // 		items += '<div value="'+arr[i]+'" class="item">x'+arr[i]+'</div>';
  //     }
  // 	b.html(items);
  // 	this.leverageItemClick(b);
  // 	this.leverageItemDef(b);
  // }

  leverageItemClick(obj) {
    obj.find(".item").bind("click", function () {
      var n = $(this).text();
      var v = $(this).attr("value");
      var b = $(this).parent().parent();
      b.find(".selects_text").html(n);
      $(".leverage_list").hide();
      b.find('input[name="leverage"]').val(v);
      sc();
    });
  }

  leverageItemDef(obj) {
    var n = obj.find(".item").eq(0).text();
    var v = obj.find(".item").eq(0).attr("value");
    var b = obj.parent().parent();
    b.find(".selects_text").html(n);
    b.find('input[name="leverage"]').val(v);
  }

  addLotClick() {
    //console.log("ID do usuário logado: " + userId);
    // Binary up
    this.obj.find(".addlot_binary .up").bind("click", (event) => {
      this.addLotBinary("up",event);
    });

    // Binary down
    this.obj.find(".addlot_binary .down").bind("click", (event) => {
      this.addLotBinary("down",event);
    });
  }

  addLotBinary(trend,event) {
    const x = event.clientX; // posição X relativa à janela
    const y = event.clientY; // posição Y relativa à janela

    //console.log(`Clique detectado em X: ${x}, Y: ${y}`);
    if (this.blocked === 1) return false;
    this.blocked = 1;

    const b = this.obj.find(".addlot_binary");
    const lot = Number(b.find('input[name="lot_amount"]').val());
    const binarytime = Number(b.find('input[name="binarytime"]').val());

    playSound("sounds/ok.mp3");
    // Enviar dados via socket
    this.socket.emit("add_lot", {
      form: {
        trend: trend,
        lot: lot,
        currency_id: Number(this.currency.id),
        binarytime: binarytime,
        x,
        y
      }
    });
    
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({'event': 'operacao'});

  }


  addChartBinaryLot(lot) {
    //    if(this.currency.forex == 1) return false;
    if (userdata.demo != lot.demo) return false;
    var course_start = lot["course_start"];
    var time_start = lot["time_start"];
    var time_end = Number(lot["time_end"]) * 1000 + 999;
    var lot_id = lot["id"];
    var trend = lot["trend"];
    var amount = lot["lot"];

    var text = "";
    var color = "";
    var linha_fim = "";
    var arrow = "";
    var lineColor = '#475760';

    if (trend == "up") {
      // if (!this.mob) arrow = " ➚";
      arrow = " ➚";
      text = "R$ " + amount + arrow;
      color = "#39b14f";
      linha_fim = "#39b14f40";
    } else {
      // if (!this.mob) arrow = " ➘";
      arrow = " ➘";
      text = "R$ " + amount + arrow;
      color = "#d62940";
      linha_fim = "#d6294045";
    }

    // Vertical line
    var t = time_end - this.server.time;
    var time_end2 = Math.floor(this.convertTimeResolution(time_end) / 1000);

    var obj1 = this.widget.activeChart().createShape(
      { time: time_end2, price: 0 },
      {
        shape: "vertical_line",
        lock: true,
        disableSelection: true,
        disableSave: true,
        disableUndo: true,
        zOrder: "bottom",
        overrides: {
          linecolor: linha_fim,
          linestyle: 0,
          showTime: false,
          showLabel: false,
          text: "Fechamento",
          textcolor: color,
        },
      }
    );

    var obj2 = this.widget
      .activeChart()
      .createOrderLine()
      .setText(text)
      .setQuantity(false)
      .setLineColor(color)
      .setBodyTextColor("white")
      .setBodyBorderColor(color)
      .setBodyBackgroundColor(color)
      .setQuantityBackgroundColor("#000000")
      .setQuantityBorderColor(color)
      .setLineLength("0")
      .setPrice(course_start)
      .setLineStyle(0);

    this.lots_obj.push([lot_id, time_end, obj1, obj2]);
  }

  addChartForexLot(lot) {
    if (this.currency.forex == 0) return false;

    var course_start = lot["course_start"];
    var time_start = lot["time_start"];
    var lot_id = lot["id"];
    var trend = lot["trend"];
    var amount = lot["lot"];
    var takeprofit = lot["takeprofit_course"];
    var stoploss = lot["stoploss_course"];

    var text = "";
    var color = "";
    if (trend == "up") {
      text = "R$" + amount + " ➚";
      color = "#21a133";
    } else {
      text = "R$" + amount + "  ➘";
      color = "#dd2e32";
    }

    var obj1;
    var obj2;
    var obj3;

    var t = this;

    // Lot line
    obj1 = this.widget
      .activeChart()
      .createOrderLine()
      .setText(text)
      .setQuantity(false)
      .setLineColor(color)
      .setBodyTextColor("white")
      .setBodyBorderColor(color)
      .setBodyBackgroundColor(color)
      .setQuantityBackgroundColor(color)
      .setQuantityBorderColor(color)
      .setLineLength("50")

      .onCancel("onCancel called", function (text) {
        t.manualLotClose(lot_id);

        //this.remove();
      })
      .setPrice(course_start);

    if (takeprofit > 0) {
      color = "#dd2e32";
      obj2 = this.widget
        .activeChart()
        .createOrderLine()
        .setText("Takeprofit")
        .setQuantity(false)
        .setLineColor(color)
        .setLineStyle(2)
        .setBodyTextColor("white")
        .setBodyBorderColor(color)
        .setBodyBackgroundColor(color)
        .setQuantityBackgroundColor(color)
        .setQuantityBorderColor(color)
        .setLineLength("50")

        .setPrice(takeprofit);
    }

    if (stoploss > 0) {
      color = "#dd2e32";
      obj3 = this.widget
        .activeChart()
        .createOrderLine()
        .setText("stoploss")
        .setQuantity(false)
        .setLineColor(color)
        .setLineStyle(2)
        .setBodyTextColor("white")
        .setBodyBorderColor(color)
        .setBodyBackgroundColor(color)
        .setQuantityBackgroundColor(color)
        .setQuantityBorderColor(color)
        .setLineLength("50")

        .setPrice(stoploss);
    }

    this.lots_forex_obj.push([lot_id, obj1, obj2, obj3]);
  }

  lotsForexclosed() {
    if (this.currency.forex == 0) return false;
    for (var i = 0; i < this.lots_forex_obj.length; i++) {
      var id = this.lots_forex_obj[i][0];
      if (this.arrSearch(id)) {
        if (id) {
          this.lotForexclosed(id);
        }
      }
    }
  }

  lotsBinaryclosed() {
    if (this.currency.forex == 1) return false;
    for (var i = 0; i < this.lots_obj.length; i++) {
      var id = this.lots_obj[i][0];
      if (this.arrSearch(id)) {
        if (id) {
          var obj1 = this.lots_obj[i][2];
          var obj2 = this.lots_obj[i][3];
          if (obj1) this.widget.activeChart().removeEntity(obj1);
          if (obj2) obj2.remove();
          this.lots_obj[i] = new Array();
          //playSound("sounds/alert.mp3");
        }
      } else {
        var time_end = this.lots_obj[i][1];
        var obj2 = this.lots_obj[i][3];
        let time = serverdata.time
          ? time_end - serverdata.time
          : time_end - new Date().getTime()
        if (time < 1) {
          var obj1 = this.lots_obj[i][2];
          var obj2 = this.lots_obj[i][3];
          if (obj1) this.widget.activeChart().removeEntity(obj1);
          if (obj2) obj2.remove();
          this.lots_obj[i] = new Array();
        } else {

          let totalSeg = Math.floor(time / 1000);
          let temp_restante = `${String(Math.floor(totalSeg / 60)).padStart(
            2,
            "0"
          )}:${String(totalSeg % 60).padStart(2, "0")}`;
          if (obj2) obj2.setQuantity(temp_restante);
        }
      }
    }
  }

  arrSearch(id) {
    if (id == undefined) return false;
    for (var i = 0; i < this.lots_close.length; i++) {
      var id2 = this.lots_close[i]["id"];
      if (id == id2) return true;
    }
    return false;
  }

  lotForexclosed(lot_id) {
    for (var i = 0; i < this.lots_forex_obj.length; i++) {
      var id = this.lots_forex_obj[i][0];
      if (id == lot_id) {
        ///playSound("sounds/alert.mp3");
        var obj1 = this.lots_forex_obj[i][1];
        var obj2 = this.lots_forex_obj[i][2];
        var obj3 = this.lots_forex_obj[i][3];
        if (obj1) obj1.remove();
        if (obj2) obj2.remove();
        if (obj3) obj3.remove();
        this.lots_forex_obj[i] = new Array();
      }
    }
  }

  chartResolution(interval) {
    let resolucao = {
      1: "1m",
      5: "5m",
      15: "15m",
      30: "30m",
      60: "1h",
      240: "4h",
      1440: "1d",
    };
    this.obj.find(".timeresol_val").html(resolucao[interval]);
  }

  priceFormat(amount) {
    var letter = "R$";
    if (amount < 0) {
      amount = amount.replace("-", "");
      amount = "-" + letter + amount;
    }
    if (amount > 0) {
      amount = "+" + letter + amount;
    }
    if (amount == 0) {
      amount = letter + amount;
    }

    return amount;
  }

  manualLotClose(id) {
    $.ajax({
      url: "/traderoom/lots/closelot",
      type: "post",
      data: { id: id },
      error: function () { },
      success: function (response) { },
    });
    // playSound("sounds/ok.mp3");
  }

  // Load lots on load page (once)
  activeLots() {
    if (this.lots_load == 1) return false;
    this.lots_load = 1;
    var lots = this.lots_open;
    for (var i = 0; i < lots.length; i++) {
      this.addChartBinaryLot(lots[i]);
      //  this.addChartForexLot(lots[i]);
    }
  }

  initChart(symbol, category) {
    const savedFull = localStorage.getItem('tv_full_state2');
    this.widget = new TradingView.widget({
      debug: false,
      fullscreen: false,
      symbol: symbol,
      interval: "1",
      autosize: true,
      width: "100%",
      height: "auto",
      container: "placeholder_" + this.id,
      datafeed: new Datafeeds.UDFCompatibleDatafeed(
        this.restapi,
        this.wsurl,
        
      ),
      library_path: "/chart/charting_library/",
      locale: 'pt',
      toolbar_bg: "transparent",
      theme: "Dark",
      custom_css_url: "/css/chart.css?",
      timezone: this.timezone,
      enabled_features: [
        "seconds_resolution",
        "tick_resolution",
        "secondary_series_extend_time_scale",
        "custom_resolutions",
      ],
      disabled_features: [
        "widget_logo",
        "header_widget",
        "symbol_search_hot_key",
        "use_localstorage_for_settings",
        "left_toolbar",
        "header_widget_dom_node",
        "context_menus",
        "display_market_status",
        "footer_screenshot",
        "timeframes_toolbar",
        "side_toolbar_in_fullscreen_mode",
        "header_compare",
        "header_undo_redo",
        "header_screenshot",
        "header_fullscreen_button",
        "header_settings",
        "header_symbol_search",
        "high_density_bars",
        "cl_feed_return_all_data",
        "symbol_info",
        "header_saveload",
        "border_around_the_chart",
        "compare_symbol",
        "main_series_scale_menu",
        "remove_library_container_border",
        "chart_property_page_style",
        "show_chart_property_page",
        "chart_property_page_scales",
        "chart_property_page_background",
        "chart_property_page_timezone_sessions",
        "chart_property_page_trading",
        "caption_buttons_text_if_possible",
        "dont_show_boolean_study_arguments",
        "hide_last_na_study_output",
        "timezone_menu",
        "snapshot_trading_drawings",
        "source_selection_markers",
        "keep_left_toolbar_visible_on_small_screens",
        "go_to_date",
        "adaptive_logo",
        "show_dom_first_time",
        "hide_left_toolbar_by_default",
        "create_volume_indicator_by_default",
        "create_volume_indicator_by_default_once",
        "volume_force_overlay",
        "right_bar_stays_on_scroll",
        "constraint_dialogs_movement",
        "charting_library_debug_mode",
        "show_dialog_on_snapshot_ready",
        "study_market_minimized",
        "study_dialog_search_control",
        "side_toolbar_in_fullscreen_mode",
        "high_density_bars",
        "cl_feed_return_all_data",
        "uppercase_instrument_names",
        "show_trading_notifications_history",
        "support_multicharts",
        "header_layouttoggle",
        "chart_crosshair_menu",
        "show_logo_on_all_charts",
        "add_to_watchlist",
        "footer_screenshot",
        "open_account_manager",
        "trading_notifications",
        "multiple_watchlists",
        "context_menus",
        "legend_widget",
      ],

      overrides: {
        "symbolWatermarkProperties.transparency": 97,
        "symbolWatermarkProperties.color": "#FFFFFF",
        "scalesProperties.textColor": "#555d6e",
        "paneProperties.background": "#00060a",
        "paneProperties.backgroundType": "solid",
        "mainSeriesProperties.lineStyle.color": "#cecece",
        "mainSeriesProperties.lineStyle.linewidth": 2,
        "mainSeriesProperties.areaStyle.linecolor": "#cecece",
        "mainSeriesProperties.areaStyle.linewidth": 2,
        "mainSeriesProperties.areaStyle.color1": "#353d4c",
        "mainSeriesProperties.areaStyle.color2": "#0c172a",
        "mainSeriesProperties.areaStyle.transparency": 30,
        "paneProperties.legendProperties.showSeriesOHLC": false,
        //"paneProperties.vertGridProperties.color": "#040c11",
        //"paneProperties.horzGridProperties.color": "#040c11",
        // "mainSeriesProperties.showCountdown": true,
        'scalesProperties.showLeftScale': false,
        'scalesProperties.showRightScale': true,
        'mainSeriesProperties.priceScale': "Right",
        "mainSeriesProperties.priceLineColor": "#fff",
        "mainSeriesProperties.priceLineWidth": 2,
      },
    });


    var widget = this.widget;

    var corVerde = '#00a667';
    var corVermelho = '#ff025c';

    widget.onChartReady(
      function () {

        if (savedFull) {
          this.widget.load(JSON.parse(savedFull));
        }

        // auto-save
        const saveFullChart = () => {
          this.widget.save((state) => localStorage.setItem('tv_full_state2', JSON.stringify(state)));
        };

        const chart = this.widget.chart();
        chart.onSymbolChanged().subscribe(undefined, saveFullChart);
        chart.onIntervalChanged().subscribe(undefined, saveFullChart);
        this._saveFullChartTimer = setInterval(saveFullChart, 3000);

        setInterval(function(t) {

            if(t.currency.k != t.widget.chart().symbol()){

              t.reinitializeChart(w1.currency.k);
            
            }
        }, 450,this);
        widget
          .chart()
          .onSymbolChanged()
          .subscribe(
            null,
            function () {
              this.dataloaded = 0;
            }.bind(this)
          );

        widget
          .chart()
          .onDataLoaded()
          .subscribe(
            null,
            function () {
              if (this.dataloaded == 0) this.dataloaded = 1;

              setTimeout(
                function () {
                  $(".loader").hide();
                }.bind(this),
                450
              );
            }.bind(this)
          );

        widget.activeChart().setChartType(this.chart_type);
        widget.activeChart().executeActionById("chartReset");
        // widget
        //   .activeChart()
        //   .setVisibleRange(
        //     { from: this.timeNow(serverdata.time) - 1800, to: this.timeNow(serverdata.time) },
        //     { percentRightMargin: 10 }
        //   );

        widget.activeChart().setResolution(this.resolution);
        this.chartResolution(this.resolution);

        widget.activeChart().getSeries().setChartStyleProperties(1, {
          upColor: corVerde,
          downColor: corVermelho,
          borderUpColor: corVerde,
          borderDownColor: corVermelho,
          wickUpColor: corVerde,
          wickDownColor: corVermelho
        });

        widget.activeChart().getSeries().setChartStyleProperties(3, {
          upColor: corVerde,
          downColor: corVermelho,
          borderUpColor: corVerde,
          borderDownColor: corVermelho,
          wickUpColor: corVerde,
          wickDownColor: corVermelho
        });

        widget.activeChart().getSeries().setChartStyleProperties(8, {
          upColor: corVerde,
          downColor: corVermelho,
          borderUpColor: corVerde,
          borderDownColor: corVermelho,
          wickUpColor: corVerde,
          wickDownColor: corVermelho
        });


        new ChartBar(this.widget, this.obj, this.id);

        this.reinitializeChart(this.currency.k);
        //this.serverData();
      }.bind(this)
    );
  }

  timeNow() {
    return Date.now();
  }

  inputPlusMinus() {
    this.obj.find(".amount_minus").bind("click", function () {
      var input = $(this).parent().find("input");
      var input_div = $(this).parent().find(".input_value");

      var v = input.val();
      // v--;
      v = v / 2;
      if (v < 1) v = 1;
      v = v.toFixed(0);
      input.val(v);
      input_div.text("R$" + v);
      sc();
    });

    this.obj.find(".amount_plus").bind("click", function () {
      var input = $(this).parent().find("input");
      var input_div = $(this).parent().find(".input_value");
      var v = input.val();
      // v++;
      v = v * 2;
      if (v < 1) v = 1;
      v = v.toFixed(0);
      input.val(v);
      input_div.text("R$" + v);
      sc();
    });
  }

  binaryTimesPlusMinus() {
    this.obj.find(".time_minus").bind(
      "click",
      function () {
        // console.log('clicou -');

        if (this.timepos > 0) this.timepos--;
        this.binaryTimesDef(this.timepos);

        sc();
      }.bind(this)
    );

    this.obj.find(".time_plus").bind(
      "click",
      function () {
        // console.log('clicou +');
        if (this.timepos < this.timepos_max) this.timepos++;

        this.binaryTimesDef(this.timepos);

        sc();
      }.bind(this)
    );
  }
}
