//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("HTG_010","HVAC_COM","FINAL",AInfo["Job Cost"],"N");
	updateFee("HTG_020","HVAC_COM","FINAL",1,"N");
}

