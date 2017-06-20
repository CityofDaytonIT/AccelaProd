//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("EL_010","ELEC_COM","FINAL",AInfo["Job Cost"],"N");
	updateFee("EL_020","ELEC_COM","FINAL",1,"N");
}

