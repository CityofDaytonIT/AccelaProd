//Script 3
if (matches(appTypeArray[3], "Application", "Renewal") && wfTask=="Issue Registration" && wfStatus=="Issued") {
	if (balanceDue > 0 || feeTotalByStatus("NEW") > 0) {
		showMessage = true; 
		cancel = true ; 
		comment("Cannot issue registration when fees are due.");
	}
}