/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_WEB_SERVICES.js
| Event   : N/A
| Agency  : MSP
|
| Notes: Developed to allow EMSE scripts to call AA Web Services. Should only be used for operations
| not supported by AA object methods
/------------------------------------------------------------------------------------------------------*/
logDebug("Accessing INCLUDES_WEB_SERVICES");

var baseURL = "http://"
var wsAgency = "DAYTON"
var wsUser = "admin"
var wsPass = "admin"

var SSOURL = "SSOService";
var SEQGENURL = "SequenceGeneratorService";

/***** TEST ****/

//	sessID = getSessionID();
//	nextNumber = getNextMaskedSeq(sessID, "MPSC Number Mask", "MPSC Number Sequence", "Agency");
//	aa.print(nextNumber);


/****************************************************** FUNCTIONS ********************************************/
function getNextMaskedSeq(sessID, maskName, seqName, seqType) {
	return getNextSequence(maskName);
}

function getNextSequence(maskName) {
	var agencySeqBiz = aa.proxyInvoker.newInstance("com.accela.sg.AgencySeqNextBusiness").getOutput();
	var params = aa.proxyInvoker.newInstance("com.accela.domain.AgencyMaskDefCriteria").getOutput();
	params.setAgencyID(aa.getServiceProviderCode());
	params.setMaskName(maskName);
	params.setRecStatus("A");
	params.setSeqType("Agency");

	var seq = agencySeqBiz.getNextMaskedSeq("ADMIN", params, null, null);

	return seq;
}

function getNextMaskedSeqOLD(sessID, maskName, seqName, seqType) {
	xmlout = '';
	xmlout += '<?xml version="1.0" encoding="utf-8"?>'
	xmlout += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.ws.accela.com" '
	xmlout += 'xmlns:urn="urn:BeanService" xmlns:x-="http://xml.apache.org/xml-soap">'
   	xmlout += '<soapenv:Body>'
      	xmlout += '<ser:getNextMaskedSeq>'
        xmlout += ' <ser:sessionID>' + sessID + '</ser:sessionID>'
       	xmlout += ' <ser:params>'
     	xmlout += '      <urn:agencyID>' + wsAgency + '</urn:agencyID>'
    	xmlout += '      <urn:exactMatch>true</urn:exactMatch>'
     	xmlout += '      <urn:maskName>' + maskName + '</urn:maskName>'
      	xmlout += '      <urn:recStatus>A</urn:recStatus>'
       	xmlout += '    	 <urn:seqName>' + seqName + '</urn:seqName>'
  	xmlout += '      <urn:seqType>' + seqType + '</urn:seqType>'
  	xmlout += '</ser:params>'
  	xmlout += '    </ser:getNextMaskedSeq>'
 	xmlout += '  </soapenv:Body>'
	xmlout += '</soapenv:Envelope>'
	try { 
		postResp = aa.util.httpPostToSoapWebService(baseURL + SEQGENURL, xmlout, null, null, "http://service.ws.accela.com/getNextMaskedSeq");
		if (postResp.getSuccess()) {
			resp = postResp.getOutput();
			if (resp.indexOf("ErrorCode") > 0) {
				errMess = processError(resp);
				aa.print("Web Service call returned error" + errorMess);
			}
			else {
				rSessionID = new RegExp("<getNextMaskedSeqReturn>(.*)</getNextMaskedSeqReturn>");
				matchArray = resp.match(rSessionID);
				if (matchArray && matchArray.length > 1) {
					secondMatch = matchArray[1];
					return secondMatch;
				}
			}
		}
		else { 
			aa.print("Error getting sequence number" + postResp.getErrorMessage());
		}
	}
	catch (err) {
		aa.print("Error : " + err.toString());
	}
	return null;


}

function getSessionID() {
	xmlout = '';
	xmlout += '<?xml version="1.0" encoding="utf-8"?>'
	xmlout += '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
	xmlout += 'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.ws.accela.com">'
	xmlout += '<soapenv:Body>'
      	xmlout += '	<ser:signon soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
       	xmlout += '		<agencyID xsi:type="xsd:string">' + wsAgency + '</agencyID>'
       	xmlout += '		<userId xsi:type="xsd:string">' + wsUser + '</userId>'
       	xmlout += '		<password xsi:type="xsd:string">' + wsPass + '</password>'
    	xmlout += '	</ser:signon>'
 	xmlout += '</soapenv:Body>'
	xmlout += '</soapenv:Envelope>'

	try { 
		postResp = aa.util.httpPostToSoapWebService(baseURL + SSOURL, xmlout, null, null, "http://service.ws.accela.com/signon");
		if (postResp.getSuccess()) {
			resp = postResp.getOutput();
			if (resp.indexOf("ErrorCode") > 0) {
				errMess = processError(resp);
				aa.print("Web Service call returned error" + errorMess);
			}
			else {
				rSessionID = new RegExp("<signonReturn(?:.*)>(.*)</signonReturn>");
				matchArray = resp.match(rSessionID);
				if (matchArray && matchArray.length > 1) {
					secondMatch = matchArray[1];
					return secondMatch;
				}
			}
		}
		else { 
			aa.print("Error getting session Id" + postResp.getErrorMessage());
		}
	}
	catch (err) {
		aa.print("Error : " + err.toString());
	}
	return null;
}

function processError(outXml) {
	errorCode = "";
	errorMessage = "";
	var rErrorCode = new RegExp("<ErrorCode>(.*)</ErrorCode>");
	var rErrorMess = new RegEpx("<ErrorMessage>(.*)>/ErrorMesssage>");
	cArr = outXml.match(rErrorCode);
	if (cArr && cArr.length > 1) errorCode = cArr[1];
	mArr = outXml.match(rErrorMess);
	if (mArr && mArr.length > 1) errorCode = mArr[1];
	return errorCode + ":" + errorMessage;
}
