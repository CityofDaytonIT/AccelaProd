//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("HTG_010","HVAC_RES","FINAL",AInfo["Job Cost"],"N");
	updateFee("HTG_020","HVAC_RES","FINAL",1,"N");
}

