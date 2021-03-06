function nativeBrowser(a){
    var link = $(a).attr('href');
    navigator.app.loadUrl(link,{openExternal : true});
    var ref = window.open(link, '_blank', 'location=no');
}
$('.zoomInDSSP').click(function(){
    var dsspWidth = $('#dsspIMG').width();
    if(dsspWidth < 1200){
        var newWidth = dsspWidth+(dsspWidth*0.5);
        $('#dsspIMG').width(newWidth);
    }
});
$('.zoomOutDSSP').click(function(){
    var dsspWidth = $('#dsspIMG').width();
    if(dsspWidth > 300){
        var newWidth = dsspWidth-(dsspWidth*0.33333);
        $('#dsspIMG').width(newWidth);
    }
});
function h(h) {
  $('#search').val($(h).attr('id'));
  $( "#nav-panelHistory" ).panel( "close" );
}
function render(h) {
    var idRender = $(h).attr('id');
    switch(idRender) {
        case 'cartoon':
            cartoon();
            break;
        case 'tube':
            tube();
            break;
        case 'lines':
            lines();
            break;
        case 'line-trace':
            lineTrace();
            break;
        case 'sline':
            sline();
            break;
        case 'trace':
            trace();
            break;
    }
  $( "#nav-panelConfig" ).panel( "close" );
}
$('#nav-panelHistory').click(function () {
  $( "#nav-panelHistory" ).panel( "close" );
});
$('#btnGraph').click(function () {
    //capturo el valor ingresado
    var valStructure = $("#search").val();
    //limpio el contenido de los resultados
    $("#graph").empty();
    $("#dsspMain").empty();
    $("#seqMain").empty();
    $("#pubTitle").empty();
    $("#pubAbstract").empty();
    //si no se ingresa nada, no lo deja continuar
    if(valStructure == ""){
        console.log("ALERTA: no se introdujo texto");
        setTimeout(function(){
          $.mobile.loading( 'show', {
                theme: "b", 
                text: "Textbox is empty",
                textVisible: true, 
                textonly: true
            });
        }, 1);
        setTimeout(function(){
            $.mobile.loading('hide');
        }, 2000);
    }else{
        structureURL = "http://www.rcsb.org/pdb/files/"+valStructure+"-noatom.xml"
        $.get(structureURL, function(data, status){
            console.log("SI EXISTE");
            $('#structureNAME').text(valStructure);
            setTimeout(function () {
                $(':mobile-pagecontainer').pagecontainer('change', '#viewer', {
                    transition: 'fade',
                    changeHash: true,
                    reverse: true,
                    showLoadMsg: false
                });
                $.mobile.loading( 'show', {
                    theme: "b", 
                    text: "Loading data from web server",
                    textVisible: true, 
                    textonly: false
                });
            }, 1);
            var db = window.openDatabase("Database", "1.0", "History", 20000);
            db.transaction(addItem, errorCB, successCB);
            onDeviceReady(); // esto se debe comentar
            getPMC(valStructure);
            getDSSP(valStructure, 1); 
            loadGraphics(valStructure);
            setTimeout(function(){
                $.mobile.loading('hide');
            }, 6000);
        })
        .fail(function(status) {
            console.log("NO EXISTE");
            setTimeout(function(){
              $.mobile.loading( 'show', {
                    theme: "b", 
                    text: "The ID doesn't exists in the database",
                    textVisible: true, 
                    textonly: true
                });
            }, 1);
            setTimeout(function(){
                $.mobile.loading('hide');
            }, 2000);
        });
        
    }
});
 /*--- GET THE INFO FOR THE STRUCTURE  --- */
 function loadGraphics(structureID) {
    viewer.clear();
    pdbURL = "http://www.rcsb.org/pdb/files/"+structureID+".pdb";
    pv.io.fetchPdb(pdbURL, function(structure) {
      structure1 = structure;
      var ligand = structure.select({'rnames' : ['SAH', 'RVP']});
      viewer.ballsAndSticks('structure.ligand', ligand, {});
      viewer.centerOn(structure);
      viewer.fitParent();
      viewer.cartoon('protein', structure, { color : pv.color.ssSuccession(), showRelated : '1' });
      
    });
    viewer.requestRedraw();
    viewer.fitParent();
    window.dispatchEvent(new Event('resize'));
}
function getSeq (structure, sequence) {
    /blue/g
    sequence = sequence.replace(/\n/g,"");
    var Seq = require("biojs-vis-sequence");
    var mySequence = new Seq({
      sequence : sequence,
      target : 'seqMain',
      format : 'CODATA',
      columns : {
        size : 18,
        spacedEach : 6
      },
      formatOptions : {
        title:false,
        footer:false
      },
      id : structure
    });
    console.log('se cargo la secuencia');
    window.dispatchEvent(new Event('resize'));
}
function toLetters(num) {
    "use strict";
    var mod = num % 26,
        pow = num / 26 | 0,
        out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
    return pow ? toLetters(pow) + out : out;
}
function getDSSP(structure, num){
    chain = toLetters(num);
    dsspURL ="http://www.rcsb.org/pdb/explore/remediatedChain.do?structureId="+structure+"&chainId="+chain;
    var img = new Image();
    $(img).load(function(){
        $('#dsspMain').append($(this));
    }).attr({
        src: dsspURL,
        id: "dsspIMG"
    }).error(function(){
        console.log('probando Chain: '+chain);
        if(num<27){
            getDSSP(structure, ++num);    
        }
        
    });
    window.dispatchEvent(new Event('resize'));
}

function getPMC(structure){
    // get the pub ID through the RCSB site
    structureURL = "http://www.rcsb.org/pdb/files/"+structure+"-noatom.xml"
    $.get(structureURL, function(data, status){
        xmlDoc = $.parseXML(data),
        $xml = $(xmlDoc),
        $pubId = $xml.find("pdbx_database_id_PubMed");
        $seq = $xml.find("pdbx_seq_one_letter_code_can");
        getSeq(structure,$seq.text());
        pcmID = $pubId.text();
        if(pcmID == ""){
            console.log("No hay un ID PubMed");
            $('#pubTitle').text("No se pudo obtener un ID de pubmed");
        }else{
            publicationURL = "http://www.ncbi.nlm.nih.gov/pubmed/"+pcmID+"?report=xml&format=text"
            $.get(publicationURL, function(data, status){
                // convierto el html en xml
                prexmlPub = $.parseXML(data),
                $preXmlpub = $(prexmlPub),
                $xmlText = $preXmlpub.find("pre");
                // convierto el xml en objetos
                xmlPub = $.parseXML($xmlText.text()),
                $xmlpub = $(xmlPub),
                $title = $xmlpub.find("ArticleTitle");
                $abstract = $xmlpub.find("AbstractText");
                // consigo todos los autores del articulo
                $xmlpub.find("Author").each(function(){
                    //console.log($(this).find("LastName").text());
                    //console.log($(this).find("Initials").text());
                });
                $('#pubTitle').text($title.text());
                var shortAbstract = jQuery.trim($abstract.text());
                $('#pubAbstract').text(shortAbstract);
                $('#pubmedBtn').attr({
                    onclick: "window.open(\'http://www.ncbi.nlm.nih.gov/pubmed/"+pcmID+"\', \'_self\', \'location=no\');return false;"

                });
                
            })
            .done(function() {
                console.log("SI se pudo conseguir la publicacion");
                window.dispatchEvent(new Event('resize'));
            })
            .fail(function() {
                console.log("NO se pudo conseguir la publicacion");
                window.dispatchEvent(new Event('resize'));
            });
        }
    })
    .done(function() {
        console.log("SI se pudo conseguir la estructura");
        window.dispatchEvent(new Event('resize'));
    })
    .fail(function() {
        console.log("NO se pudo conseguir la estructura");
        window.dispatchEvent(new Event('resize'));
    });
}

/* --- DATABASE INTERACTIONS --- */

// Wait for device API libraries to load
document.addEventListener("deviceready", onDeviceReady, false);
// device APIs are available
function onDeviceReady() {
    //evito el scroll en ciertas paginas
    touchMove = function(event) {
        event.preventDefault();
    }
    var structure1;
    viewer = pv.Viewer(document.getElementById('graph'), { 
        width : 500, height: 500, antialias : true, 
        outline : true, quality : 'medium', style : 'hemilight',
        background : '#fff', animateTime: 500, doubleClick : null
    });
    window.addEventListener('resize', function() {
        viewer.fitParent();
    });
    var db = window.openDatabase("Database", "1.0", "History", 2000000);
    db.transaction(createDB, errorCB, successCB);
    db.transaction(loadHistory, errorCB, successCB);
}
// Populate the database
function createDB(tx) {
    //tx.executeSql('DROP TABLE IF EXISTS HISTORY');
    tx.executeSql('CREATE TABLE IF NOT EXISTS HISTORY (ID INTEGER PRIMARY KEY ASC, STRUCTURE)');
}
function loadHistory(tx) {
    tx.executeSql ('SELECT DISTINCT STRUCTURE FROM HISTORY ORDER BY ID DESC LIMIT 10', [], querySuccess, errorCB);
}
function addItem(tx) {
    var valSearch = $("#search").val();
    tx.executeSql('INSERT INTO HISTORY (STRUCTURE) VALUES ("'+valSearch+'")');
    tx.executeSql ('SELECT DISTINCT STRUCTURE FROM HISTORY ORDER BY ID DESC LIMIT 10', [], querySuccess, errorCB);
}
function dropDB(tx) {
    tx.executeSql('DROP TABLE IF EXISTS HISTORY');
}
// Transaction error callback
function errorCB(err) {
   console.log("Error processing SQL: "+err.code);
}
// Transaction success callback
function successCB() {
    console.log("consulta a BD exitosa");
}
function querySuccess(tx, results) {
    var len = results.rows.length;
    $("#historyList").html('<li ><a href="#" data-rel="close" class="ui-btn ui-btn-icon-right ui-icon-delete">Close History</a></li>');
    for(var i = 0; i < len; i ++) {
        var listaActual = $("#historyList").html();
        $("#historyList").html(listaActual+"<li onclick='h(this)' id='"+results.rows.item(i).STRUCTURE+"' ><a id='"+results.rows.item(i).STRUCTURE+"' class='ui-btn ui-btn-icon-right ui-icon-carat-r historyItem' href='#'>"+results.rows.item(i).STRUCTURE+"</a></li>");
    }
    return false;
}

function cartoon() {
  viewer.clear();
  var go = viewer.cartoon('structure', structure1, {
      color : color.ssSuccession(), showRelated : '1',
  });
  go.setSelection(structure1.select({ rnumRange : [15,20] }));
  
  var rotation = viewpoint.principalAxes(go);
  viewer.setRotation(rotation)
}

function tube() {
  viewer.clear();
  var go = viewer.tube('structure', structure1);
  viewer.lines('structure.ca', structure1.select({aname :'CA'}),
            { color: color.uniform('blue'), lineWidth : 1,
              showRelated : '1' });
  go.setSelection(structure1.select({ rnumRange : [15,20] }));
}

function lines() {
  viewer.clear();
  var go = viewer.lines('structure', structure1, {
              color: color.byResidueProp('num'),
              showRelated : '1' });
  go.setSelection(structure1.select({ rnumRange : [15,20] }));
}

function lineTrace() {
  viewer.clear();
  var go = viewer.lineTrace('structure', structure1, { showRelated : '1' });
  go.setSelection(structure1.select({ rnumRange : [15,20] }));
}

function sline() {
  viewer.clear();
  var go = viewer.sline('structure', structure1,
          { color : color.uniform('red'), showRelated : '1'});
  go.setSelection(structure1.select({ rnumRange : [15,20] }));
}

function trace() {
  viewer.clear();
  var go = viewer.trace('structure', structure1, { showRelated : '1' });
  go.setSelection(structure1.select({ rnumRange : [15,20] }));

}
