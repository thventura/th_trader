//  Chart options (timeframes, types, drawing, and more)


class ChartBar {
	
    constructor(widget, obj, w) {
	  this.w = w;	
      this.widget = widget;
	  this.obj = obj;
	  this.closeClick(); 
		
	
	  this.indicatorsOpenClick();	
	  this.indicatorsCategoryClick();
 	
		
		
	  this.subscribeRangeChanged();
      this.subscribeResolutionChanged();
	  this.timeframesOpenClick();
	  this.timeframesClick();
		
		
	
	  this.typechartOpenClick();
	  this.typechartCategoryClick();

		
		
	  this.timeresolutOpenClick();
	  this.timeresolutItemClick();
		
		
	  
	  this.panOpenClick();	
	  this.panItemClick();	
		
	  
	  this.cleanOpenClick();	
	  this.cleanItemClick();	
		
		
    }
	
	
	cleanOpenClick(){
		this.obj.find('.icon_clean').bind('click', function() {
			var st  = this.obj.find('.clean').css('display');
			if(st == 'none'){
				 $('body').find('.iconbar_window').fadeOut();
				this.obj.find('.clean').fadeIn();
			}else{
				this.obj.find('.clean').fadeOut();
			}
			sc();
        }.bind(this));
	}
	
	
	cleanItemClick(){
		var t = this;
		var widget = this.widget;
		this.obj.find('.clean .item').bind('click', function() {
			var v = $(this).attr('value');
			if(v == 'del_pan' || v == 'del_all'){
				widget.activeChart().removeAllShapes();
				widget.selectLineTool("cursor");
			}  
			if(v == 'del_indicators'  || v == 'del_all'){
				widget.activeChart().removeAllStudies();
				t.indicatorsList('added', 0); 
			} 
			sc();
			$('.iconbar_window').fadeOut(); 
		});
	}
	
		
	 
	panOpenClick(){
		this.obj.find('.icon_pan').bind('click', function() {
			var st  = this.obj.find('.pan').css('display');
			if(st == 'none'){
				 $('body').find('.iconbar_window').fadeOut();
				this.obj.find('.pan').fadeIn();
			}else{
				this.obj.find('.pan').fadeOut();
			}
			sc();
        }.bind(this));
	}
	
	panItemClick(){
	   var t = this;
	   var widget = this.widget;
	   this.obj.find('.pan .item').bind('click', function() {
		 var v = $(this).attr('value');
		 if(v != undefined){
		      widget.selectLineTool(v);
			  sc();
			  $('.iconbar_window').fadeOut();
	     } 
        });
	}
	
		
	
	
	// Open list Time resolution
	timeresolutOpenClick(){
		this.obj.find('.icon_timeresol').bind('click', function() {
			var st  = this.obj.find('.timeresol').css('display');
			if(st == 'none'){
				 $('body').find('.iconbar_window').fadeOut();
				this.obj.find('.timeresol').fadeIn();
			}else{
				this.obj.find('.timeresol').fadeOut();
			}
			sc();
        }.bind(this));
	}
	
	
	
	
	timeresolutItemClick(){
	   var t = this;
	   var widget = this.widget;
	   this.obj.find('.resolution').bind('click', function() {
		 var v = $(this).attr('value');
		 if(v > 0){
				 
				widget.activeChart().setResolution(v);
				w1.resolution = v;
				// widget.activeChart().setResolution(v+'S');
				 $.ajax({
					url: '/traderoom/chart_save',
					type: 'post',
					data: {'resolution': v},
					dataType: "json",	
						error:function(){
						},
						success: function(status){ 
							console.log(status)
							if(status == 'ok'){
								console.log(v)
							}
						}
						});
			 $('.iconbar_window').fadeOut(); 
			 sc();
	     } 
        });
	}
	
	indicatorDelClick(){
		let t = this;
		var widget = this.widget;
		this.obj.find('.indicators_list .indic_del').bind('click', function() {
			var id = $(this).attr('value');
			if(id){
				widget.activeChart().removeEntity(id);
			}
			t.indicatorsList('emuso');
		});
	}
	
	indicatorSettingsClick(){
		var widget = this.widget;
		var t = this;
		this.obj.find('.indicators_list .indic_settings').bind('click', function() {
			var id = $(this).attr('value');
			if(id){  
				widget.activeChart().showPropertiesDialog(id);
				$('.iconbar_window').fadeOut();
			}
			sc();
					
		});
	}
	
	
	
 
	studyGetIdByName(n){
	    var r = '';
		var arr = this.widget.activeChart().getAllStudies();
		arr.forEach(({id, name }) => {
			if(n == name) r = id;
        });
		return r;
	}
	
	
	
	
	
	indicatorsCategoryClick(){
		var t = this;
		
		this.obj.find('.indicators .category .item').bind('click', function() {
			var category  = $(this).attr('value');			
			t.indicatorsList(category);
		  
        });
	}
	
	
	
	indicatorsList(category){
		let t = this;
	   	var list = this.obj.find('.indicators_list');
		list.html('');
		if(category == 'lista'){
			let lista = this.widget.getStudiesList();
			lista.forEach(item => {
				list.append(`
					<div class="indic_item">
						<div class="indic_ico"></div>
						<div class="indic_name" value="${item}">${item}</div> 
						<div class="clear"></div>
					</div>
	 			`)
			})			
		}
		if(category == 'emuso'){
			let lista = this.widget.activeChart().getAllStudies();
			lista.forEach(item => {
				list.append(`
					 <div class="indic_item">
						<div class="indic_ico"></div>
						<div class="indic_name">${item.name}</div> 
						<div class="indic_del" name="${item.name}" value="${item.id}"></div> 
						<div class="indic_settings" value="${item.id}"></div>   
							
							<div class="clear"></div>
					</div>
				`);
			})
			var count = list.find('.indic_item').length;
			t.obj.find('.indicators .added').text(count);
		}
		t.indicatorItemClick();
		t.indicatorDelClick();
		t.indicatorSettingsClick();
	}
	
	indicatorItemClick(){
		var t = this;
		var widget = this.widget;
		this.obj.find('.indicators_list .indic_name').bind('click', function() {
			
			var id = $(this).attr('value');
			widget.activeChart().createStudy(id);
			widget.activeChart().resetData();
			$('.iconbar_window').fadeOut();
		});
	}
		
	// Open list indicators
	indicatorsOpenClick(){
		this.obj.find('.icon_indicator').bind('click', function() {
			var st  = this.obj.find('.indicators').css('display');
			if(st == 'none'){
				 $('body').find('.iconbar_window').fadeOut();
				this.obj.find('.indicators').fadeIn();
				this.indicatorsList('emuso');
			}else{
				this.obj.find('.indicators').fadeOut();
			}
			sc();
        }.bind(this));
	}

	typechartOpenClick(){
		this.obj.find('.icon_candle').bind('click', function() {
			var st  = this.obj.find('.typechart').css('display');
			if(st == 'none'){
				 $('body').find('.iconbar_window').fadeOut();
				this.obj.find('.typechart').fadeIn();
			}else{
				this.obj.find('.typechart').fadeOut();
			}
			sc();
        }.bind(this));
	}
	
	typechartCategoryClick(){
		var widget = this.widget;
		var t = this;
		
	   this.obj.find('.typechart .item').bind('click', function() {
		   
		   var v = $(this).attr('value');
		   
		   
		   
		   // LIST  https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.ChartStyle/#members
		   var type = 0;
		   if(v == 'liner'){
              type = 3;
		   }
		   if(v == 'candle'){
              type = 1;
		   }
		   if(v == 'bars'){
              type = 0;
		   }   
		   if(v == 'ha'){
              type = 8;
		   } 
		   
		   
		   
		   widget.activeChart().setChartType(type); 
		   t.typechartSave(type);
		    $('.iconbar_window').fadeOut(); 
		   sc();
			
        });
	}
	
	
	typechartSave(type){
		 $.ajax({
	       url: '/traderoom/chart_save',
	       type: 'post',
           data: {'window_id': this.w,'typechart':type},
	       error:function(){
	       },
	       success: function(status){ 
	        }
		 });
	}
		
	timeframesOpenClick(){
		this.obj.find('.icon_timeframe').bind('click', function() {
		   
			var st  = this.obj.find('.timeframes').css('display');
			if(st == 'none'){
				$('body').find('.iconbar_window').fadeOut();
				this.obj.find('.timeframes').fadeIn();
			}else{
				this.obj.find('.timeframes').fadeOut();
			}
			sc();
        }.bind(this));
	} 
	
	timeframesClick(){
		var widget = this.widget;
		
	   this.obj.find('.timeframes .period').bind('click', function() {
		   
		   var minutes = $(this).attr('value');
		   
		   $('.timeframes .period').removeClass('selected');
		   $(this).addClass('selected');
		   
		   var timenow = Date.now();
		   var sec  = minutes * 60;	
           var from  = timenow-sec;

		    //widget.activeChart().resetData();
		    widget.activeChart().setVisibleRange(
             { from: from, to: timenow },
             { percentRightMargin: 10 } 
            );  
		    
	 
		  	$('.timeframes').fadeOut();

		 sc();	
        });
	}
	
	
	
	
	
	
	
	
	closeClick(){
	   this.obj.find('.iconbar_window .close').bind('click', function() {
		   $('.iconbar_window').fadeOut();
		   sc();
        });
	   
	}
	
	
	// Event change Resolution
	subscribeResolutionChanged(){
	  this.widget.activeChart().onIntervalChanged().subscribe(null, (interval) => this.chartResolution(interval));	
	}
	
	
	chartResolution(interval){
		let resolucao = {
			'1': '1m',
			'5': '5m',
			'15': '15m',
			'30': '30m',
			'60': '1h',
			'240': '4h',
			'1440': '1d',
		}
        // console.log(interval);
		 this.obj.find('.timeresol_val').html(resolucao[interval]);
	}
 
 
	
	
	// Event change Timeframes
	subscribeRangeChanged(){
		var widget  = this.widget;
	   widget.activeChart().onVisibleRangeChanged().subscribe(null,({ from, to }) => this.onchartScroll(from, to));	
	}
	
	onchartScroll(from, to){
	 if(to >  from){
        var s = to-from;
		var r = '30d';
		var minutes = s/60;
		var hours = s/60/60; 
		minutes = minutes.toFixed();
		hours = hours.toFixed();
		var v = 0;
		if(minutes > 60){
			v = hours+'h';
		}else{
			if(minutes < 8){
                 minutes = 5; 
			}else{
                 minutes =  Math.round(minutes/10)*10;
			}	
	        v = minutes+'m';
		}
		// console.log(v,from,to)
		this.obj.find('.timeframe_val').html(v);
	  }
	}

	
}