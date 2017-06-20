//Script 7
logDebug("Checking Fee balance");
if (wfTask=="Permit Issuance" && wfStatus=="Issued") {
	if (balanceDue > 0 || feeTotalByStatus("NEW") > 0) {
		showMessage = true; 
		cancel = true ; 
		logMessage("Cannot issue permit when are fees are due.")
	}
}
