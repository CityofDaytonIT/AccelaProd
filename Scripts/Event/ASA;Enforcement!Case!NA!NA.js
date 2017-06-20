showDebug = 3;
/*===================================================================*/
//ID: 46
//Name: 
//Developer: 
//Developer Agency: 
//Script Description: 
//Status: 
/*===================================================================*/
try {
	var addResult = aa.address.getAddressByCapId(capId);
	if (addResult.getSuccess()) { 
		var aoArray = addResult.getOutput(); 
		if (aoArray.length) { 
			var ao = aoArray[0]; 

			// get caps with same address
			var capAddResult = aa.cap.getCapListByDetailAddress(ao.getStreetName(),ao.getHouseNumberStart(),ao.getStreetSuffix(),ao.getZip(),ao.getStreetDirection(),null);
			if (capAddResult.getSuccess())	{ 
				var capIdArray = capAddResult.getOutput()

				for (c in capIdArray) {
					var relcap = aa.cap.getCap(capIdArray[c].getCapID()).getOutput();
					var reltype = relcap.getCapType().toString();
					
					logDebug(reltype +": " +appTypeString)
					
					if (reltype == appTypeString) {
						if (matches(""+relcap.getCapStatus(), "Active", "Appeal", "Attempt to Contact", "Awaiting Court Decision","In Violation","In Violation - Reissue", "New")) {
							updateAppStatus("Potential Duplicate")
							break
						}
					}
				}
			}
			else logDebug("**ERROR: getting similar addresses: " + capAddResult.getErrorMessage())
		}
		else logDebug("No address found on record.")
	}
	else logDebug("**ERROR: getting address by cap ID: " + addResult.getErrorMessage())
}
catch(err) {logDebug(err)}


/*===================================================================*/
//ID: 
//Name: 
//Developer: Chris Godwin
//Developer Agency: Woolpert
//Script Description: Schedule Complaint Inspection on same day, assign inspection to record detail assigned to staff.
//Status: 
/*===================================================================*/
var numDays = 0;//set value to the number of days ahead to schedule inspection
var assignedStaff = getAssignedToStaff();
scheduleInspectDate("Complaint",dateAdd(null,numDays),assignedStaff);


/**********************************************************************
populate transactional address attributes from reference

*/

	refId = null;
	var addResult = aa.address.getAddressByCapId(capId);
	if (addResult.getSuccess()) {
		var addArray = addResult.getOutput();
		if (addArray) {
			firstAddress = addArray[0];
			refId = firstAddress.getRefAddressId();
			transID = firstAddress.getAddressId();
			logDebug("Ref address id = " + refId + " transaction id = " + transID);

		}
	}		
	if (refId != null) {
		refAddrResult = aa.address.getRefAddressByPK(String(refId));
		if (refAddrResult.getSuccess()) {
			refAddr = refAddrResult.getOutput();
			refAddressModel = refAddr.getRefAddressModel();
			refAttrs = refAddressModel.getAttributes();
			transAttrs = firstAddress.getAttributes();
			if(refAttrs != null){
				var refAttrsArr = refAttrs.toArray();
				for( var tIndex in refAttrsArr) {
					refAttribute = refAttrsArr[tIndex];
                                        if (refAttribute.getAttributeValue() && refAttribute.getAttributeValue() != "") {
                                            editAppSpecific(refAttribute.getAttributeLabel(), "" + refAttribute.getAttributeValue());
					    transAttrIter = transAttrs.iterator();
					    while (transAttrIter.hasNext()) {
					    	transAttribute = transAttrIter.next();
						if (transAttribute.getB1AttributeName() == refAttribute.getAttributeName()) {
							transAttribute.setB1AttributeValue(refAttribute.getAttributeValue());
						}
                                            }
					}
				}

				var addrBiz = aa.proxyInvoker.newInstance("com.accela.aa.aamain.address.AddressBusiness").getOutput();
				if (addrBiz != null) {
					addrBiz.editAddressWithAPOAttribute(capId, firstAddress, transAttrs);
				}
			}
		}
	}	


/*===================================================================*/
//ID: 
//Name: 
//Developer: James Lloyd
//Developer Agency: Woolpert
//Script Description: 
/*===================================================================*/
include("hansenToAccela");

