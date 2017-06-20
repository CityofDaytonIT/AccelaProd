//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("GAS_010","GAS_COM","FINAL",AInfo["Job Cost"],"N");
	updateFee("GAS_020","GAS_COM","FINAL",1,"N");
}

