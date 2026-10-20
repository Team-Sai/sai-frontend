import { useEffect, useRef, useState } from "react";



import {

  useNavigate,

  useParams,

} from "react-router-dom";



import LoadingSkeleton from "../../common/components/LoadingSkeleton";



import ContractDocument from "../../contract/components/ContractDocument";

import PartiesInfo from "../../contract/components/PartiesInfo";



import "../../contract/shared.css";

import "./SettlementArchivePreviewPage.css";



import {

  getContractAccount,

  getContractSignatures,

  getLoanContract,

  type ContractSignatures,

} from "../../contract/api/contractApi";



import type {

  LinkedBankAccount,

} from "../../accounts/types/account";



import type {

  ContractFormData,

  CreditorInfo,

  LoanContractResponse,

  RepaymentMethod,

} from "../../contract/types/contract";



import type {

  AppliedContractClause,

} from "../../contract/types/clauseAgent";



import {

  parseArchivedContractTerms,

} from "../pdf/contractTerms";



import {

  downloadContractPdf,

} from "../pdf/downloadContractPdf";





const EMPTY_SIGNATURES:

  ContractSignatures = {

  creditorSignatureDataUri:

    null,



  debtorSignatureDataUri:

    null,

};





/* =========================================================

   Contract 데이터 변환

\========================================================= */



function toContractFormData(

  contract:

    LoanContractResponse,

): ContractFormData {

  return {

    relationType:

      "ACQUAINTANCE",



    principalAmount:

      contract.principalAmount != null

        ? String(

            contract.principalAmount,

          )

        : "",



    interestRate:

      contract.interestRate != null

        ? String(

            contract.interestRate,

          )

        : "",



    repaymentType:

      (

        contract.repaymentType ??

        "EQUAL_PRINCIPAL_AND_INTEREST"

      ) as RepaymentMethod,



    startDate:

      contract.startDate ??

      "",



    maturityDate:

      contract.maturityDate ??

      "",



    repaymentDay:

      contract.repaymentDay != null

        ? String(

            contract.repaymentDay,

          )

        : "",



    contractAlias:

      contract.contractAlias ??

      "",



    terms:

      contract.terms ??

      "",



    creditorAddress:

      contract.creditorAddress ??

      "",



    selectedLinkedAccountId:

      "",

  };

}





/* =========================================================

   저장된 특약 복원

\========================================================= */



function toAppliedClauses(

  terms:

    string | null | undefined,



  contractId:

    number,

): AppliedContractClause[] {

  const clauses =

    parseArchivedContractTerms(

      terms,

    );



  return clauses.map(

    (

      clause,

      index,

    ) => ({

      id:

        `archive-${contractId}-${index + 1}`,



      title:

        clause.title,



      templateContent:

        clause.content,



      slots:

        [],



      source:

        "AI" as const,



      createdAt:

        0,



      summary:

        "",



      issues:

        [],



      references:

        [],



      warnings:

        [],

    }),

  );

}





/* =========================================================

   Read-only noop

\========================================================= */



function noopFieldChange<

  K extends keyof ContractFormData,

>(

  field:

    K,



  value:

    ContractFormData[K],

) {

  void field;

  void value;

}





function noopClauseAction(

  clauseId:

    string,

) {

  void clauseId;

}





/* =========================================================

   Page

\========================================================= */



export default function ContractArchivePreviewPage() {

  
  const contractSheetRef = useRef<HTMLElement | null>(null);

const navigate =

    useNavigate();



  const {

    contractId,

  } =

    useParams<{

      contractId:

        string;

    }>();





  const numericContractId =

    contractId !==

    undefined

      ? Number(

          contractId,

        )

      : NaN;





  const isInvalidId =

    Number.isNaN(

      numericContractId,

    );





  const [

    contract,

    setContract,

  ] =

    useState<

      LoanContractResponse | null

    >(null);





  const [

    account,

    setAccount,

  ] =

    useState<

      LinkedBankAccount | null

    >(null);





  const [

    creditorSignatureDataUri,

    setCreditorSignatureDataUri,

  ] =

    useState<

      string | null

    >(null);





  const [

    debtorSignatureDataUri,

    setDebtorSignatureDataUri,

  ] =

    useState<

      string | null

    >(null);





  const [

    isLoading,

    setIsLoading,

  ] =

    useState(

      true,

    );





  const [

    error,

    setError,

  ] =

    useState<

      string | null

    >(null);





  const [

    isDownloading,

    setIsDownloading,

  ] =

    useState(

      false,

    );





  /* =========================================================

     Load

  ========================================================= */



  useEffect(

    () => {

      /*

       \* 잘못된 ID의 경우 렌더 단계에서

       \* isInvalidId를 먼저 처리한다.

       \*

       \* effect 내부에서 즉시 setState를 호출하지 않는다.

       */

      if (

        isInvalidId

      ) {

        return;

      }



      let cancelled =

        false;





      Promise.all([

        getLoanContract(

          numericContractId,

        ),





        getContractSignatures(

          numericContractId,

        ).catch(

          (

            signatureError,

          ) => {

            console.error(

              "[ContractArchivePreviewPage] 서명 이미지 조회 실패",

              signatureError,

            );



            return (

              EMPTY_SIGNATURES

            );

          },

        ),





        getContractAccount(

          numericContractId,

        ).catch(

          (

            accountError,

          ) => {

            console.error(

              "[ContractArchivePreviewPage] 수취 계좌 조회 실패",

              accountError,

            );



            return null;

          },

        ),

      ])

        .then(

          ([

            contractData,

            signatures,

            accountData,

          ]) => {

            if (

              cancelled

            ) {

              return;

            }



            setContract(

              contractData,

            );



            setAccount(

              accountData,

            );



            setCreditorSignatureDataUri(

              signatures

                .creditorSignatureDataUri,

            );



            setDebtorSignatureDataUri(

              signatures

                .debtorSignatureDataUri,

            );



            setError(

              null,

            );

          },

        )

        .catch(

          (

            requestError:

              unknown,

          ) => {

            if (

              cancelled

            ) {

              return;

            }



            console.error(

              "[ContractArchivePreviewPage] 차용증 조회 실패",

              requestError,

            );



            setContract(

              null,

            );



            setError(

              "차용증 내역을 불러올 수 없습니다.",

            );

          },

        )

        .finally(

          () => {

            if (

              !cancelled

            ) {

              setIsLoading(

                false,

              );

            }

          },

        );





      return () => {

        cancelled =

          true;

      };

    },

    [

      numericContractId,

      isInvalidId,

    ],

  );





  /* =========================================================

     PDF Download

  ========================================================= */



  async function handleDownloadClick() {
    if (
      !contract ||
      isDownloading
    ) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadContractPdf(
        contract.contractId,
      );
    } catch (downloadError) {
      console.error(
        "[ContractArchivePreviewPage] PDF 다운로드 실패",
        downloadError,
      );

      alert(
        "차용증 PDF 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setIsDownloading(false);
    }
  }




  /* =========================================================

     View Data

  ========================================================= */



  const formData =

    contract

      ? toContractFormData(

          contract,

        )

      : null;





  const creditorInfo:

    CreditorInfo | null =

    contract

      ? {

          name:

            contract.creditorName ??

            "-",



          birthDate:

            contract.creditorBirthDate ??

            "-",

        }

      : null;





  const debtorInfo =

    contract

      ? {

          name:

            contract.debtorName ??

            "-",



          birthDate:

            contract.debtorBirthDate ??

            "-",

        }

      : null;





  const appliedClauses =

    contract

      ? toAppliedClauses(

          contract.terms,

          contract.contractId,

        )

      : [];





  const documentStatusText =

    contract?.status ===

    "COMPLETED"

      ? "체결 완료"

      : "보관 계약";





  /* =========================================================

     Render

  ========================================================= */



  return (

    <div className="page preview-page archive-contract-preview">



      {/* ===================================

          Toolbar

      =================================== */}



      <div className="preview-toolbar">



        <button

          type="button"

          className="btn btn--ghost"

          onClick={() =>

            navigate(

              "/archive",

            )

          }

        >

          목록으로

        </button>





        <button

          type="button"

          className="btn btn--primary"

          onClick={

            handleDownloadClick

          }

          disabled={

            isDownloading ||

            !contract

          }

        >

          {isDownloading && (

            <span

              className="button-spinner"

              aria-hidden="true"

            />

          )}



          PDF 다운로드

        </button>



      </div>





      {/* ===================================

          Invalid ID

      =================================== */}



      {isInvalidId ? (



        <div className="preview-status">

          <p>

            잘못된 차용증 번호입니다.

          </p>

        </div>



      ) : isLoading ? (



        /* ===================================

           Loading

        =================================== */



        <div className="preview-status">



          <LoadingSkeleton

            className="loading-skeleton--page"

            rows={

              8

            }

          />



        </div>



      ) : error ||

        !contract ||

        !formData ? (



        /* ===================================

           Error

        =================================== */



        <div className="preview-status">



          <p>

            {

              error ??

              "차용증 내역을 불러올 수 없습니다."

            }

          </p>



        </div>



      ) : (



        <>

          {/* ===================================

              Archive Contract Sheet

          =================================== */}



          <section
            ref={contractSheetRef}
            className="archive-contract-sheet"
            aria-label="보관 계약서 미리보기"
          >



            {/* =================================

                기존 ContractDocument 재사용

            ================================= */}



            <div className="archive-contract-sheet__body">



              <ContractDocument

                formData={

                  formData

                }



                onFieldChange={

                  noopFieldChange

                }



                creditorInfo={

                  creditorInfo

                }



                debtorName={

                  contract.debtorName

                }



                appliedClauses={

                  appliedClauses

                }



                draftClause={

                  null

                }



                recentlyAppliedClauseId={

                  null

                }



                fieldWarnings={

                  []

                }



                onOpenClauseSettings={

                  noopClauseAction

                }



                onRemoveClause={

                  noopClauseAction

                }



                disabled



                readOnly



                documentStatusText={

                  documentStatusText

                }

              />



            </div>





            {/* =================================

                당사자 정보

            ================================= */}



            <div className="archive-contract-sheet__parties">



              <PartiesInfo

                creditorInfo={

                  creditorInfo

                }



                creditorAddress={

                  contract.creditorAddress ??

                  ""

                }



                onCreditorAddressChange={() =>

                  undefined

                }



                debtorInfo={

                  debtorInfo

                }



                debtorAddress={

                  contract.debtorAddress ??

                  ""

                }



                mode="READ_ONLY"



                disabled

              />



            </div>





            {/* =================================

                전자서명

            ================================= */}



            {(

              creditorSignatureDataUri ||

              debtorSignatureDataUri

            ) && (

              <div className="archive-contract-signatures">



                <div className="archive-contract-signatures__item">



                  <span>

                    채권자 전자서명

                  </span>



                  {creditorSignatureDataUri ? (



                    <img

                      src={

                        creditorSignatureDataUri

                      }

                      alt="채권자 전자서명"

                    />



                  ) : (



                    <strong>

                      서명 없음

                    </strong>



                  )}



                </div>





                <div className="archive-contract-signatures__item">



                  <span>

                    채무자 전자서명

                  </span>



                  {debtorSignatureDataUri ? (



                    <img

                      src={

                        debtorSignatureDataUri

                      }

                      alt="채무자 전자서명"

                    />



                  ) : (



                    <strong>

                      서명 없음

                    </strong>



                  )}



                </div>



              </div>

            )}





            {/* =================================

                수취 계좌

            ================================= */}



            {account && (

              <div className="archive-contract-account">



                <span>

                  변제금 수취 계좌

                </span>



                <strong>

                  {account.bankName}

                  {" · "}

                  {account.maskedAccountNumber}

                </strong>



                <small>

                  예금주{" "}

                  {account.accountHolderName}

                </small>



              </div>

            )}



          </section>





          {/* ===================================

              Disclaimer

          =================================== */}



          <p className="archive-contract-disclaimer">

            * 본 계약서는 당사자가 입력하고 확정한 계약 내용을 기반으로

            작성·보관된 문서입니다. 구체적인 법률관계에 따라 별도의 확인이

            필요할 수 있습니다.

          </p>

        </>

      )}



    </div>

  );

}